Submission Materials
====================

This folder contains the artifacts required for submission/delivery:

Required files (prepare before submission):

- APK / IPA: Release build of mobile app (signed).
- README: Project overview, features, and setup instructions.
- Performance Report: `docs/performance-benchmarks.md` (already included).
- Test Results: Unit & integration test summaries and CI run ids.
- Model Files: `mobile-app/assets/models/mobilefacenet.tflite` and `face_detection_short_range.tflite` (ensure licenses permit redistribution).
- APK/IPA size and model sizes.

Suggested extras:

- Demo video (30-60s) showing registration and recognition flow.
- Slide deck: short PPT or PDF outlining architecture, features, and performance (see outline below).

Slide deck outline:

1. Title & Team
2. Problem Statement
3. Solution Overview
4. Architecture Diagram (see `docs/architecture.md`)
5. Key Features (offline recognition, liveness, anti-spoofing, AWS sync)
6. Performance Highlights (key metrics)
7. Security & Privacy (encryption, local-only images policy)
8. Demo screenshots / video
9. How to run (setup steps)
10. Next steps & roadmap

Checklist before submit:

- [ ] Verify the required TFLite model files are present and benchmarks are recorded.
- [ ] Run `npm test` and include test report.
- [ ] Run `pod install` and build iOS on macOS; attach workspace or build logs.
- [ ] Create signed release builds (Android APK/AAB, iOS IPA) and include them.

*** End of file
