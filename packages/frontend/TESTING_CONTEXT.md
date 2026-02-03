# Testing Context - Manual Browser Testing with Playwright MCP

## Current State
- **Branch**: `claude/admin-dashboard-template-tTX48`
- **Dev Server**: Run with `bun run dev:full` from project root (serves at http://localhost:5173)
- **MCP Config**: `~/.claude/mcp.json` configured with `@playwright/mcp@latest`

## Setup Before Testing
1. Start the dev server: `bun run dev:full` (from project root)
2. Verify server is running at http://localhost:5173
3. Ensure Playwright MCP is connected (check with `/mcp` command)

## Manual Testing Plan (Using Playwright MCP)

### 1. Login Page (http://localhost:5173/login)
Navigate to the login page and verify:
- [ ] Page loads without errors
- [ ] Logo "A" is visible in top-left
- [ ] "Admin Dashboard" heading is displayed
- [ ] "Manage users, groups, and permissions" description shown
- [ ] "Welcome back" card is visible
- [ ] "Continue with Google" button is present and clickable
- [ ] Theme toggle button is in top-right corner
- [ ] Footer text "Need access? Contact your administrator" is shown

### 2. Theme Toggle
- [ ] Click theme toggle button
- [ ] Verify theme switches between light and dark
- [ ] Reload the page and verify theme persists

### 3. Protected Routes (should redirect to /login)
Try navigating to each route and confirm redirect:
- [ ] `/` -> redirects to `/login`
- [ ] `/users` -> redirects to `/login`
- [ ] `/groups` -> redirects to `/login`
- [ ] `/settings` -> redirects to `/login`
- [ ] `/audit-logs` -> redirects to `/login`

### 4. Responsive Design
Test at different viewport sizes:
- [ ] Mobile (375x667) - all elements visible and usable
- [ ] Tablet (768x1024) - layout adapts properly
- [ ] Desktop (1280x800) - full layout displayed

### 5. Visual Verification
- [ ] Take screenshots at each viewport size
- [ ] Verify gradient background is visible
- [ ] Check card has proper shadow/styling
- [ ] Confirm Google button has correct icon

## Playwright MCP Commands to Use
- `browser_navigate` - Go to URLs
- `browser_screenshot` - Capture current state
- `browser_click` - Click elements
- `browser_snapshot` - Get accessibility tree (for finding elements)
- `browser_resize` - Change viewport size

## Command to Resume
After restart, say: "Read TESTING_CONTEXT.md and manually test the frontend using Playwright MCP"
