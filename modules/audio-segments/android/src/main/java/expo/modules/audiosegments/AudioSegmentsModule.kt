package expo.modules.audiosegments

import android.media.MediaCodec
import android.media.MediaExtractor
import android.media.MediaFormat
import android.media.MediaMuxer
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record
import java.io.File
import java.nio.ByteBuffer

class SegmentRecord : Record {
  @Field var start: Double = 0.0
  @Field var end: Double = 0.0
}

class NoAudioTrackException : CodedException("The file has no audio track")
class NoSegmentException : CodedException("No segment inside the recording")

/** Copies time ranges of an audio file, back to back, into a new m4a file (no re-encoding). */
class AudioSegmentsModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioSegments")

    // Returns the copied ranges (seconds in the source, snapped to audio frames) and where
    // each starts in the new file
    AsyncFunction("extractSegments") { source: String, segments: List<SegmentRecord>, destination: String ->
      extract(toPath(source), segments, toPath(destination))
    }
  }

  private fun toPath(uri: String): String = if (uri.startsWith("file://")) Uri.parse(uri).path!! else uri

  private fun extract(source: String, segments: List<SegmentRecord>, destination: String): List<Map<String, Double>> {
    val extractor = MediaExtractor()
    var muxer: MediaMuxer? = null
    try {
      extractor.setDataSource(source)
      val track = (0 until extractor.trackCount).firstOrNull {
        extractor.getTrackFormat(it).getString(MediaFormat.KEY_MIME)?.startsWith("audio/") == true
      } ?: throw NoAudioTrackException()
      extractor.selectTrack(track)
      val format = extractor.getTrackFormat(track)
      val bufferSize =
        if (format.containsKey(MediaFormat.KEY_MAX_INPUT_SIZE)) format.getInteger(MediaFormat.KEY_MAX_INPUT_SIZE) else 256 * 1024

      File(destination).delete()
      val out = MediaMuxer(destination, MediaMuxer.OutputFormat.MUXER_OUTPUT_MPEG_4)
      muxer = out
      val outTrack = out.addTrack(format)
      out.start()

      val buffer = ByteBuffer.allocate(bufferSize)
      val info = MediaCodec.BufferInfo()
      val copied = mutableListOf<Map<String, Double>>()
      var cursorUs = 0L

      for (segment in segments) {
        val startUs = (segment.start * 1_000_000).toLong().coerceAtLeast(0)
        val endUs = (segment.end * 1_000_000).toLong()
        if (endUs <= startUs) continue
        extractor.seekTo(startUs, MediaExtractor.SEEK_TO_PREVIOUS_SYNC)
        var firstUs = -1L
        var lastUs = -1L
        var frameUs = 0L
        while (true) {
          val size = extractor.readSampleData(buffer, 0)
          if (size < 0) break
          val time = extractor.sampleTime
          if (time >= endUs) break
          if (time >= startUs || firstUs >= 0) {
            if (firstUs < 0) firstUs = time
            if (lastUs >= 0) frameUs = time - lastUs
            lastUs = time
            val flags = if (extractor.sampleFlags and MediaExtractor.SAMPLE_FLAG_SYNC != 0) MediaCodec.BUFFER_FLAG_KEY_FRAME else 0
            info.set(0, size, cursorUs + (time - firstUs), flags)
            out.writeSampleData(outTrack, buffer, info)
          }
          extractor.advance()
        }
        if (firstUs < 0) continue
        val lengthUs = lastUs - firstUs + frameUs
        copied.add(
          mapOf(
            "start" to firstUs / 1_000_000.0,
            "end" to (firstUs + lengthUs) / 1_000_000.0,
            "outStart" to cursorUs / 1_000_000.0,
          )
        )
        cursorUs += lengthUs
      }
      if (copied.isEmpty()) throw NoSegmentException()
      out.stop()
      return copied
    } catch (e: Exception) {
      File(destination).delete()
      throw e
    } finally {
      muxer?.release()
      extractor.release()
    }
  }
}
