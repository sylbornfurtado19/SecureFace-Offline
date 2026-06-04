-keep class org.tensorflow.lite.** { *; }
-keep class com.google.mediapipe.** { *; }
-keep class com.facebook.react.** { *; }
-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }

-keepclasseswithmembernames class * {
    native <methods>;
}

-keepclasseswithmembers class * {
    *** *Keystore(...);
}

-keepclasseswithmembers class * {
    *** *Encryption(...);
}

-keep public class * {
    public protected <methods>;
}

-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
