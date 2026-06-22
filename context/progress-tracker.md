# Progress Tracker

Update this file whenever the current phase, active feature, or implementation state changes.

## Current Phase

- Feature 17 (Canvas Ergonomics) — complete

## Current Goal

- Canvas zoom/history control bar and matching keyboard shortcuts are implemented.

## Completed

- Feature 01 (21/06/26): Design System — shadcn/ui installed and configured for Tailwind v4, dark-only theme tokens restored in `app/globals.css`, Button/Card/Dialog/Input/Tabs/Textarea/ScrollArea components added to `components/ui/`, `lucide-react` installed, and `lib/utils.ts` `cn()` helper added. `npm run lint` and `npx tsc --noEmit` pass.
- Feature 02 (21/06/26): Editor Chrome — editor navbar added with sidebar toggle state icons, floating project sidebar shell added with shadcn Tabs and empty states, and reusable editor dialog content pattern added for future title/description/footer actions. `npm run lint` and `npx tsc --noEmit` pass.
- Feature 03 (21/06/26): Authentication — ClerkProvider wraps the root layout with the dark Clerk theme, sign-in/sign-up pages are implemented, `proxy.ts` protects all non-auth routes by default, `/` redirects by auth state, `/editor` hosts the editor shell, and the editor navbar includes Clerk's `UserButton`. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 04 (21/06/26): Project Dialogs — `/editor` home screen added with New Project action, mock project sidebar items added, owned project rename/delete actions wired, shared project actions hidden, mobile sidebar scrim closes on outside tap, and create/rename/delete dialogs are managed by a dedicated hook. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 05 (21/06/26): Prisma Project Models — Project and ProjectCollaborator models added with status enum, relations, indexes, unique collaborator constraint, cascade delete, Prisma singleton added with Accelerate/direct adapter branching, first migration applied, and Prisma client generated. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 06 (22/06/26): Project API Routes — backend-only REST endpoints added for listing, creating, renaming, and deleting projects; routes use Clerk user IDs as project owners, default missing create names to `Untitled Project`, enforce owner-only rename/delete, and return explicit `401`/`403` responses. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 07 (22/06/26): Wire Editor Home — `/editor` fetches owned/shared project data server-side, the sidebar uses real project lists, project dialogs are backed by `POST`/`PATCH`/`DELETE` project API calls, create generates a slug-plus-suffix room ID aligned with the project ID, and create/delete navigate or refresh as required. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 08 (22/06/26): Editor Workspace Shell — `/editor/[roomId]` server component added with Clerk identity lookup and project access checks, unauthorized/missing projects render `AccessDenied`, workspace shell renders project-name navbar, share and AI sidebar controls, highlighted project sidebar, central canvas placeholder, and right AI chat placeholder. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 09 (22/06/26): Share Dialog — workspace Share button opens a dialog with project link copy feedback, collaborator listing enriched from Clerk user data, owner-only invite/remove actions, and collaborator read-only mode. Collaborator API route added with server-side access checks. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 10 (22/06/26): Liveblocks Setup — `liveblocks.config.ts` defines Presence and UserMeta, cached Liveblocks node client helper added with deterministic cursor colors, `/api/liveblocks-auth` verifies Clerk auth and project access, ensures rooms exist, and returns a Liveblocks room token with user metadata. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 11 (22/06/26): Base Canvas — workspace placeholder replaced with a client Liveblocks/React Flow canvas wrapper, shared canvas node/edge types added, empty synced nodes and edges initialized through `useLiveblocksFlow`, and basic canvas rendering includes loose connections, `fitView`, MiniMap, and dot-pattern background. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 12 (22/06/26): Shape Panel — bottom-center draggable shape toolbar added for rectangle, diamond, circle, pill, cylinder, and hexagon; drop handling converts screen coordinates to canvas coordinates and creates `canvasNode` nodes with empty labels, default color, shape data, default size, and generated IDs. Basic custom node rendering displays new nodes as bordered rectangles. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 13 (22/06/26): Node Shape Rendering — custom node renderer now displays rectangle, pill, and circle with CSS shapes, diamond, hexagon, and cylinder with scalable SVG shapes, selected nodes use brighter strokes, and shape dragging shows a cursor-following ghost preview using the same shape and default size as drop creation. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 14 (22/06/26): Node Editing — selected canvas nodes show subtle React Flow resize handles with minimum size constraints, node labels can be edited inline by double-clicking the centered label area, empty labels show centered placeholder text, textarea interactions avoid canvas dragging/panning, and label edits sync through the existing Liveblocks React Flow node state. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 15 (22/06/26): Node Color Toolbar — `NODE_COLORS` palette added from `ui-context.md`, canvas node data now stores background and text colors, selected nodes show a floating swatch toolbar above the node, active swatches are highlighted, hover glow uses the paired text color, and swatch clicks update node colors through the existing Liveblocks React Flow state. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 16 (22/06/26): Edge Behavior — custom `canvasEdge` renderer added with smooth-step right-angle routing, light arrowed strokes, brighter hover/selected state, wider invisible interaction path, reconnect support, multiple same-node connections, and inline labels positioned with `EdgeLabelRenderer` plus `getSmoothStepPath` label coordinates. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.
- Feature 17 (22/06/26): Canvas Ergonomics — bottom-left pill control bar added with zoom out, fit view, zoom in, undo, and redo controls; zoom actions use the React Flow instance with short animation, undo/redo use Liveblocks history with disabled states, keyboard shortcuts are centralized in `hooks/useKeyboardShortcuts.ts`, editable fields are ignored, and the MiniMap was removed. `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass.

## In Progress

- None currently.

## Next Up

- Next feature spec.

## Open Questions

- None currently.

## Architecture Decisions

- UI primitives are generated by shadcn/ui and live in `components/ui/`; generated files should not be manually modified.
- Shared class merging lives in `lib/utils.ts` via `cn()` using `clsx` and `tailwind-merge`.
- The app is dark-only: project CSS variables in `app/globals.css` are the source of truth, and shadcn theme variables map onto those tokens.
- The root `<html>` element includes the `dark` class so shadcn dark variants are active by default.
- Icons use `lucide-react`.
- Editor chrome components live in `components/editor/` and stay separate from generated shadcn primitives.
- Project sidebar is a fixed floating overlay, so opening it does not affect editor canvas layout.
- `app/page.tsx` renders `EditorShell`, which owns the sidebar open state and wires the navbar toggle to the project sidebar.
- Editor shell uses full viewport sizing (`h-dvh`, `w-full`, `min-h-0`) so the navbar and canvas adapt to screen dimensions.
- Editor dialog styling is captured as a reusable wrapper around shadcn Dialog primitives; actual dialogs are deferred until future specs.
- Geist Sans and Geist Mono are self-hosted from `app/fonts/` via `next/font/local` so production builds do not depend on Google Fonts network access.
- Clerk uses `proxy.ts` at the project root for route protection; only configured sign-in and sign-up paths are public.
- Clerk appearance is centralized in `lib/clerk-appearance.ts` and maps Clerk's dark theme to existing app CSS variables.
- The root route performs auth-state routing only: authenticated users go to `/editor`, unauthenticated users go to the configured sign-in path.
- Clerk's built-in `UserButton` is used for profile and logout flows; user menu internals are not rebuilt.
- Feature 04 uses mock project data only in the editor shell; no API calls or persistence were added.
- Project dialog state, form state, slug preview, and loading state are centralized in `useProjectDialogs`.
- Sidebar project actions are gated by `ownerType`: owned projects show rename/delete actions, shared projects do not.
- Project metadata starts in Prisma with `Project` and `ProjectCollaborator`; generated artifacts still belong in Blob storage and are referenced by `canvasJsonPath`.
- Prisma Client is generated to `app/generated/prisma` and imported by `lib/prisma.ts`.
- `lib/prisma.ts` initializes Prisma with `accelerateUrl` for `prisma+postgres://` URLs and `@prisma/adapter-pg` for direct PostgreSQL URLs, with development caching on `globalThis`.
- Project REST routes live under `app/api/projects` and intentionally stay backend-only until the UI integration feature.
- `/api/projects(.*)` is public at the Clerk proxy layer so route handlers can return explicit API `401` responses while still reading auth through `await auth()`.
- Project list/create use the authenticated Clerk user ID as `ownerId`; rename/delete first verify project ownership and return `403` for non-owner mutations.
- Editor project data is loaded in server components through `lib/project-data.ts`; client components receive already-shaped owned/shared lists.
- Editor project view models use the project ID as the sidebar slug because new project IDs are aligned with Liveblocks room IDs.
- Project mutations are centralized in `hooks/use-project-actions.ts`; create navigates to `/editor/{projectId}`, rename refreshes, and deleting the active workspace redirects to `/editor`.
- `/editor/[roomId]` performs server-side access checks before rendering a dedicated workspace shell.
- Project access checks live in `lib/project-access.ts` and allow owners or collaborators matching the current user's primary email.
- `AccessDenied` is used for non-existent projects and authenticated users without access.
- Workspace layout is client-rendered after access passes, so sidebar toggles, AI sidebar toggle, and project dialogs remain interactive while server data remains preloaded.
- Collaborator management lives under `/api/projects/[projectId]/collaborators`; listing is available to owners and collaborators, while invite/remove are owner-only.
- Collaborators continue to be stored by email only in Prisma; Clerk Backend API is used at read time to enrich display names and avatar URLs when a matching Clerk user exists.
- Share dialog state and collaborator mutations stay in the workspace client shell; project access remains enforced on the server route.
- Liveblocks application types live in `liveblocks.config.ts`; presence tracks cursor coordinates and `isThinking`, while user metadata contains name, avatar URL, and deterministic cursor color.
- Liveblocks node access lives in `lib/liveblocks.ts`; the client is cached in development and lazily initialized so production builds do not require `LIVEBLOCKS_SECRET_KEY` at build time.
- `/api/liveblocks-auth` uses the project ID as the room ID, trusts `lib/project-access.ts` for authorization, creates missing rooms with private default access, and issues a room-scoped token via `prepareSession`.
- Canvas types live in `types/canvas.ts`; the base node data shape supports label, color, and shape, with `canvasNode`/`canvasEdge` reserved as the custom type names.
- Liveblocks Storage includes an optional React Flow `flow` object because `useLiveblocksFlow` initializes it only when missing.
- `EditorCanvas` owns the client-only Liveblocks provider, room provider, suspense loading state, connection error fallback, and React Flow wiring.
- React Flow package CSS is imported from the root layout as a global external stylesheet.
- Shape drag payloads use `application/ghost-ai-canvas-shape` and include both shape name and default size.
- Shape defaults and canvas node constants live in `types/canvas.ts` so drag payload creation and node creation share the same source of truth.
- New dropped shapes are added through Liveblocks React Flow's `onNodesChange` add change, keeping creation inside the synced flow state.
- The custom canvas node renderer switches by `data.shape`; rectangle, pill, and circle are CSS shapes, while diamond, hexagon, and cylinder are scalable SVG shapes.
- Shape drag preview is custom-rendered and the browser's native drag image is hidden so the preview follows the cursor without duplicate visuals.
- Node resizing uses React Flow's `NodeResizer` inside the custom node renderer and relies on the existing `useLiveblocksFlow` dimensions change handling.
- Inline label edits replace the current node through `onNodesChange`, keeping label updates inside the synced Liveblocks flow state.
- Text editing surfaces use `nodrag`/`nopan` plus event propagation guards so editing does not trigger canvas drag or pan.
- Node color themes live in `types/canvas.ts` as `NODE_COLORS`, with paired background and text colors from `context/ui-context.md`.
- Canvas nodes store `color` as their fill/background and `textColor` as the paired label/stroke accent, with defaults matching the neutral palette.
- The selected-node color toolbar is rendered inside the custom node and updates color data via `onNodesChange` replace operations, with no server calls.
- Custom canvas nodes render four side connection handles and four side resize controls so controls sit on shape edges/vertices instead of a rectangular bounding frame.
- Edge creation bypasses React Flow's default duplicate-edge guard by adding uniquely identified edges through `onEdgesChange`; existing edges are reconnectable through `onReconnect`.
- Canvas edges use the custom `canvasEdge` type by default, store label text in `data.label`, and render through a local edge component rather than React Flow's default edge.
- Edge labels are updated with `onEdgesChange` replace operations so label edits stay in the synced Liveblocks flow state.
- Edge labels use `EdgeLabelRenderer` and the label coordinates returned by `getSmoothStepPath`; midpoint placement is not manually calculated.
- Canvas viewport controls live inside `EditorCanvas` as a bottom-left overlay and call React Flow instance methods directly for zoom out, fit view, and zoom in.
- Canvas undo and redo are wired through Liveblocks `useUndo`, `useRedo`, `useCanUndo`, and `useCanRedo`, keeping history behavior tied to the existing room state.
- Canvas keyboard shortcuts are centralized in `hooks/useKeyboardShortcuts.ts` and intentionally skip inputs, textareas, and editable fields.

## Session Notes

- Started implementation of `context/feature-specs/17-canvas-ergonomics.md`.
- Read the canvas ergonomics spec and confirmed scope is bottom-left controls, Liveblocks history, keyboard shortcuts, and removing the MiniMap.
- Added `hooks/useKeyboardShortcuts.ts` for zoom and history shortcuts, with editable-field guards.
- Added a bottom-left pill canvas control bar with zoom out, fit view, zoom in, undo, redo, and a divider between control groups.
- Wired viewport controls to the React Flow instance with short animation and wired history controls to Liveblocks undo/redo hooks with disabled button states.
- Removed the React Flow MiniMap from the canvas.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/16-edge-behavior.md`.
- Read the edge behavior spec and confirmed existing node handles/reconnect groundwork should be folded into the formal custom edge implementation.
- Added `CanvasEdgeData` with `label` in `types/canvas.ts`.
- Registered a custom `CanvasEdgeRenderer` for `canvasEdge`, using `getSmoothStepPath`, `BaseEdge`, `EdgeLabelRenderer`, arrow markers, hover/selected brightening, and wider invisible interaction width.
- Added inline edge label editing with a growing input; blur, Enter, and Escape save through `onEdgesChange`.
- Ensured new and existing edges render as `canvasEdge` with default labels, arrowheads, and reconnectable behavior.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Updated edge creation to allow multiple connections between the same shapes/handles and added edge reconnection support. Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Fixed custom node controls so connection handles appear on all four sides and selected-node resize controls use four edge controls instead of the default rectangular `NodeResizer` frame. Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/15-nodes-color-toolbar.md`.
- Read `context/ui-context.md` and confirmed the node palette should be defined as `NODE_COLORS` in `types/canvas.ts`.
- Added `NODE_COLORS`, default node text color, and `CanvasNodeData.textColor` in `types/canvas.ts`.
- Updated shape rendering so node fill uses `data.color` and labels/strokes use `data.textColor`, including fallback support for older nodes.
- Added a floating selected-node color toolbar with one swatch per palette pair, active swatch styling, tight hover glow, and drag/pan interaction guards.
- Wired swatch clicks to replace the selected node's `color` and `textColor` through the existing Liveblocks React Flow state.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/14-node-editing.md`.
- Read the node editing spec and confirmed the scope is resize handles plus inline label editing only.
- Added shared minimum node size and wired selected-node `NodeResizer` handles into the custom node renderer.
- Added centered empty-label placeholder text and double-click-to-edit behavior.
- Added an inline textarea overlay that updates node labels as users type, closes on blur or Escape, and prevents canvas drag/pan interactions while editing.
- Label updates now replace the current node via `onNodesChange`, preserving Liveblocks React Flow synchronization.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/13-node-shape.md`.
- Read the node shape spec and confirmed the scope is visual rendering plus drag preview only; drop behavior should remain unchanged.
- Replaced the placeholder custom node renderer with shape-aware rendering for all six canvas shapes.
- Added selected-state stroke styling so selected nodes use the full node color and resting nodes use a subtler color-mixed stroke.
- Added a cursor-following ghost preview for shape drags, using the same drag payload shape and default size as drop creation.
- Hid the browser native drag image during shape drags so only the custom ghost preview is visible.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/12-shape-panel.md`.
- Read the shape panel spec and confirmed the scope is drag/drop node creation only, with simple rectangle rendering for all custom node shapes.
- Expanded shared canvas types to include all six shape names, drag payload typing, default shape sizes, and default node color.
- Added a bottom-center floating shape toolbar with draggable icon buttons.
- Added canvas `dragover` and `drop` handlers that parse the shape payload, convert screen coordinates with the React Flow instance, generate shape/timestamp/counter IDs, and create `canvasNode` nodes.
- Added a basic custom node renderer that displays every shape as a simple bordered rectangle with centered label text.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/11-base-canvas.md`.
- Read the Liveblocks React Flow reference and confirmed `useLiveblocksFlow` initializes missing `flow` storage with the provided empty initial nodes and edges.
- Added shared canvas types for `CanvasNode`, `CanvasEdge`, and node data.
- Added `components/editor/editor-canvas.tsx` with `/api/liveblocks-auth`, current room ID, `cursor: null` initial presence, `ClientSideSuspense`, error fallback, empty initial nodes/edges, loose connections, `fitView`, `MiniMap`, and dot-pattern background.
- Replaced the workspace placeholder with the synced canvas while keeping `/editor/[roomId]` server-side.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/10-liveblocks-setup.md`.
- Installed `@liveblocks/node` because the local dependency set had Liveblocks client/react packages but not the server SDK required for room creation and auth tokens.
- Added `liveblocks.config.ts` with typed Presence and UserMeta.
- Added `lib/liveblocks.ts` with a cached Liveblocks node client and deterministic cursor color helper.
- Added `POST /api/liveblocks-auth` to require Clerk auth, verify project access, ensure the room exists, and authorize the user for that room with metadata.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/09-share-dialog.md`.
- Added `/api/projects/[projectId]/collaborators` for collaborator list/invite/remove with project access checks and owner-only mutations.
- Added Clerk user enrichment for collaborator emails via `clerkClient().users.getUserList`, with email-only fallback when no Clerk user is found.
- Added `components/editor/share-dialog.tsx` with project link copy feedback, collaborator list, owner invite/remove controls, and collaborator read-only state.
- Wired the workspace navbar Share button to open the share dialog.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/08-editor-workspace-shell.md`.
- Added `lib/project-access.ts` for current Clerk identity lookup and owner/collaborator project access checks.
- Added `components/editor/access-denied.tsx` for missing or unauthorized workspace access.
- Added `components/editor/editor-workspace-shell.tsx` with project-name navbar, share action placeholder, AI sidebar toggle, highlighted project sidebar, canvas placeholder, and AI chat placeholder.
- Replaced `/editor/[projectId]` with `/editor/[roomId]` and wired the page to redirect unauthenticated users to `/sign-in`, render `AccessDenied` for unavailable projects, and render the workspace shell when access is valid.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Fixed project create navigation by routing to the API-returned project ID and removing the immediate `router.refresh()` after `router.push()`; active workspace delete navigation now also avoids push-plus-refresh ordering issues.
- Started implementation of `context/feature-specs/07-wire-editor-home.md`.
- Added `lib/project-data.ts` to load owned projects by Clerk user ID and shared projects by collaborator email on the server.
- Replaced mock editor shell data with server-provided owned/shared project lists and added `/editor/[projectId]` for workspace navigation.
- Added `hooks/use-project-actions.ts` for create/rename/delete dialog state, room ID preview generation, API mutations, refreshes, and active-workspace delete redirects.
- Updated `POST /api/projects` to accept a provided string project ID so new project IDs can align with generated Liveblocks room IDs.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/06-project-apis.md`.
- Added `GET` and `POST` handlers in `app/api/projects/route.ts` for owner-scoped project listing and project creation with `Untitled Project` fallback naming.
- Added `PATCH` and `DELETE` handlers in `app/api/projects/[projectId]/route.ts` for owner-only rename and delete mutations.
- Updated `proxy.ts` so `/api/projects(.*)` is handled by route-level auth checks instead of `auth.protect()`, preserving the required `401` API response.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/05-prisma.md`.
- Added `Project` and `ProjectCollaborator` models in `prisma/models/project.prisma`, plus `lib/prisma.ts` with DATABASE_URL-based Accelerate/direct adapter branching and development global caching.
- Ran `npx prisma migrate dev --name add_project_models` and `npx prisma generate`; migration `20260621144551_add_project_models` was created and applied.
- Verification: `npx prisma format` passes; `npx prisma validate` passes; `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/04-project-dialogs.md`.
- Added project dialog state hook, editor home component, project dialogs component, and mock project type definitions.
- Wired editor shell to mock projects, project dialogs, editor home create action, sidebar create action, and owned-project rename/delete actions with a mobile sidebar backdrop.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/03-auth.md`.
- Installed `@clerk/ui`, added Clerk appearance mapping, created sign-in/sign-up pages, added `proxy.ts`, moved the editor shell to `/editor`, and changed `/` to redirect by auth state.
- Refined the large-screen auth left panel to match `context/screenshot/auth-part.png`: logo mark, strong headline block, descriptive copy, icon-led feature rows, and footer copyright.
- Updated the large-screen auth layout to split the left brand panel and right Clerk form panel 50/50.
- Switched Geist font loading from `next/font/google` to local font files to satisfy the production build requirement.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes.
- Started implementation of `context/feature-specs/02-editor.md`.
- Added editor chrome components: `components/editor/editor-navbar.tsx`, `components/editor/project-sidebar.tsx`, and `components/editor/editor-dialog.tsx`.
- Added `components/editor/editor-shell.tsx` and mounted it from `app/page.tsx` so the navbar and project sidebar are visible in the app.
- Fixed editor layout sizing so navbar spans the screen and canvas fills the remaining viewport area.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes.
- Read `context/feature-specs/01-design-system.md` and implemented it exactly within the design-system scope.
- Initialized shadcn/ui with the Nova/Radix preset and Tailwind v4 CSS-variable configuration.
- Added required shadcn primitives: Button, Card, Dialog, Input, Tabs, Textarea, and ScrollArea.
- Installed `lucide-react` and shadcn support dependencies.
- Rebuilt `app/globals.css` around the documented dark theme tokens from `context/ui-context.md`, while preserving shadcn-required imports and token mappings.
- Verification: `npm run lint` passes; `npx tsc --noEmit` passes; `npm run build` passes after switching Geist to local font files.
- npm install prisma tsx @types/pg --save-dev
- npm install @prisma/client @prisma/adapter-pg dotenv pg
- npx prisma init --output ../app/generated/prisma
- npx skills add prisma/skills
