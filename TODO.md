# TODO - Share Link Production Ready Flow

- [ ] Backend: add `publicShareId` field + index to `CandidateProfile`
- [ ] Backend: add controller method to resolve candidate profile by `publicShareId` (public, no auth)
- [ ] Backend: add public route for share viewer (e.g. `/api/v{APP_VERSION}/candidate/public/landing/:shareId`)
- [ ] Frontend (portal): add route `/in/:shareId`
- [ ] Frontend (portal): create page `PublicProfileByShareId.jsx` to fetch and render the full candidate profile using existing UI/components
- [ ] Frontend: update `ProfileDashboard.jsx` share link generation to use backend-backed `publicShareId`
- [ ] Run minimal verification:
  - [ ] Backend curl: list-by-shareId happy path + invalid shareId
  - [ ] Frontend: open `/in/:shareId` and confirm profile renders
