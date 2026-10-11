import AVFoundation
import ExpoModulesCore

struct SegmentRecord: Record {
  @Field var start: Double = 0
  @Field var end: Double = 0
}

final class NoAudioTrackException: Exception {
  override var reason: String { "The file has no audio track" }
}

final class ExportFailedException: GenericException<String> {
  override var reason: String { "Could not write the audio file: \(param)" }
}

/// Copies time ranges of an audio file, back to back, into a new m4a file.
public class AudioSegmentsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioSegments")

    // Returns the copied ranges (seconds in the source) and where each starts in the new file
    AsyncFunction("extractSegments") { (source: URL, segments: [SegmentRecord], destination: URL) async throws -> [[String: Double]] in
      let asset = AVURLAsset(url: source)
      guard let track = try await asset.loadTracks(withMediaType: .audio).first else {
        throw NoAudioTrackException()
      }
      let duration = try await asset.load(.duration).seconds

      let composition = AVMutableComposition()
      guard let output = composition.addMutableTrack(
        withMediaType: .audio, preferredTrackID: kCMPersistentTrackID_Invalid)
      else {
        throw ExportFailedException("no composition track")
      }

      var copied: [[String: Double]] = []
      for segment in segments {
        let start = max(0, segment.start)
        let end = min(duration, segment.end)
        if end <= start { continue }
        let cursor = composition.duration
        let range = CMTimeRange(
          start: CMTime(seconds: start, preferredTimescale: 48000),
          end: CMTime(seconds: end, preferredTimescale: 48000))
        try output.insertTimeRange(range, of: track, at: cursor)
        copied.append(["start": start, "end": end, "outStart": cursor.seconds])
      }
      if copied.isEmpty {
        throw ExportFailedException("no segment inside the recording")
      }

      try? FileManager.default.removeItem(at: destination)
      // Passthrough keeps the original quality and size; re-encode only if it is refused
      for preset in [AVAssetExportPresetPassthrough, AVAssetExportPresetAppleM4A] {
        guard let session = AVAssetExportSession(asset: composition, presetName: preset) else { continue }
        session.outputURL = destination
        session.outputFileType = .m4a
        await session.export()
        if session.status == .completed {
          return copied
        }
        try? FileManager.default.removeItem(at: destination)
      }
      throw ExportFailedException("export session failed")
    }
  }
}
