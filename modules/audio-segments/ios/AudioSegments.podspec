Pod::Spec.new do |s|
  s.name           = 'AudioSegments'
  s.version        = '1.0.0'
  s.summary        = 'Copies time ranges of an audio file into a new file'
  s.description    = 'Copies time ranges of an audio file into a new file (FreeSnore local module)'
  s.license        = 'MIT'
  s.author         = 'FreeSnore'
  s.homepage       = 'https://github.com/limpetdrone/FreeSnore'
  s.platforms      = { :ios => '16.4' }
  s.swift_version  = '5.9'
  s.source         = { git: 'https://github.com/limpetdrone/FreeSnore.git' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,swift}"
  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }
end
