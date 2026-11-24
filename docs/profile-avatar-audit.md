# Profile avatar audit

Reviewed 2026-11-24. The database audit was read-only; no real account avatars were changed.

## Changes

- Profile upload retains the saved picture until the API confirms success. Invalid image types and files above the backend's 5 MB limit are rejected before uploading. The file input resets for retries, and loading an account without a picture clears stale previews.
- Existing UserAvatar renders saved pictures in applicants, hiring confirmation, job details, worker job lists/tracking, service request details, service management, counterpart reviews, admin user rows/details and admin job/service listings. Missing or broken images show the existing placeholder.
- Admin user and post API projections include avatarUrl; worker job summaries now retain hirerAvatarUrl. Private profile fields remain excluded from public profile responses.
- Existing feed and topbar bindings were verified. Own-account topbar state follows a successful upload. Other viewers get the current picture on their next data load; this change does not add live cross-account push updates.

## Existing data

7 accounts: 5 have uploaded avatar references, 1 has an external picture, 1 has no picture. Three uploaded references and the external picture return an image successfully. Two uploaded references point to missing files, with no matching copy found in the project:

- 6ac68a33c43ea1829ec775e5-1792598088381.jpg
- 6ad9307e884bee521c9e2825-1793808275577.png

Those two account owners must upload their picture again or restore the original files from a backup. Their database references were left intact.

## Validation

- `npm test`: 107 frontend tests passed.
- `npm run build`: passed.
- `node --test tests/profile-avatars-backend.cjs`: 3 tests passed. Real Express/multer multipart upload and static image retrieval use a temporary directory and in-memory models; owner, outsider and admin receive the same avatar URL, and outsider profile privacy is checked.
- `HIRER_PREVIEW_URL=http://localhost:5173 node scripts/check-profile-avatars.cjs`: 17 routes passed with loaded images at 390 and 1440 px, plus admin inspector/service listings, successful/failed uploads for all three roles, and another account seeing the uploaded picture. Chrome uses isolated API and image fixtures; no real accounts are edited.
- The live database audit checked all avatar references without writes; local and external image HTTP responses were verified separately.

Restart the existing backend process to load the changed API fields, then refresh the frontend. Keep backend/uploads/avatars in persistent storage when deploying or moving the application.
