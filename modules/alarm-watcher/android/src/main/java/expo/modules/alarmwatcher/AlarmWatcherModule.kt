package expo.modules.alarmwatcher

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.AudioPlaybackConfiguration
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.annotation.RequiresApi
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val ALARM_STARTED = "onAlarmStarted"

/**
 * Reports when any app (e.g. the system clock) starts playing audio with the alarm usage.
 * Android keeps our recording running through alarms, so this is how the app notices
 * the morning alarm. Requires Android 8.0 (API 26); does nothing on older versions.
 */
class AlarmWatcherModule : Module() {
  // Typed as Any so the class loads on Android < 8.0, where AudioPlaybackCallback does not exist
  private var callback: Any? = null
  private var alarmPlaying = false

  private val audioManager: AudioManager?
    get() = appContext.reactContext?.getSystemService(Context.AUDIO_SERVICE) as? AudioManager

  override fun definition() = ModuleDefinition {
    Name("AlarmWatcher")

    Events(ALARM_STARTED)

    Function("isSupported") {
      return@Function Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
    }

    OnStartObserving {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) startWatching()
    }

    OnStopObserving {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) stopWatching()
    }

    OnDestroy {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) stopWatching()
    }
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun startWatching() {
    if (callback != null) return
    val manager = audioManager ?: return
    val playbackCallback = object : AudioManager.AudioPlaybackCallback() {
      override fun onPlaybackConfigChanged(configs: List<AudioPlaybackConfiguration>?) {
        val playing = configs?.any { it.audioAttributes.usage == AudioAttributes.USAGE_ALARM } == true
        // Only the start of an alarm is interesting, not every config change while it rings
        if (playing && !alarmPlaying) {
          this@AlarmWatcherModule.sendEvent(ALARM_STARTED, mapOf("timestamp" to System.currentTimeMillis().toDouble()))
        }
        alarmPlaying = playing
      }
    }
    manager.registerAudioPlaybackCallback(playbackCallback, Handler(Looper.getMainLooper()))
    callback = playbackCallback
  }

  @RequiresApi(Build.VERSION_CODES.O)
  private fun stopWatching() {
    (callback as? AudioManager.AudioPlaybackCallback)?.let { audioManager?.unregisterAudioPlaybackCallback(it) }
    callback = null
    alarmPlaying = false
  }
}
