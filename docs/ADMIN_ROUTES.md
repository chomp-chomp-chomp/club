# Admin Route Map

## Accessing Admin

1. Navigate to **Settings**
2. Scroll to bottom
3. **Long press version number** (5 times)
4. Admin panel opens

Only members with `is_admin = 1` can access.

## Admin Panel Structure

```
/admin
├── /admin/drop-recipe     Drop Recipe
├── /admin/club-call       Send Club Call
├── /admin/shelf           Curate Shelf
├── /admin/members         Members
├── /admin/bulletins       Bulletins
└── /admin/invite-codes    Invite Codes
```

## Route Details

### /admin
**Admin Home**

Dashboard with links to all admin functions:
- Drop recipe
- Send club call
- Curate shelf
- Members
- Bulletins
- Invite codes

### /admin/drop-recipe
**Drop Recipe**

Two modes:
1. **From Catalog** - Search cached recipes from external API
2. **Manual** - Enter custom title and URL

Actions:
- Search/refresh recipe cache
- Select recipe to drop
- Creates `recipe_dropped` pulse
- Sends push to all members

### /admin/club-call
**Send Club Call**

Send announcement to all club members.

- Text field (280 char limit)
- Live preview
- Creates `club_call` pulse
- Sends push to all members

### /admin/shelf
**Curate Shelf**

Manage the recipe shelf visible in Recipes tab.

Actions:
- Add recipe to shelf (search catalog)
- Remove recipe from shelf
- Feature/unfeature recipes
- Create collections
- Assign recipes to collections

### /admin/members
**Members**

View and manage club members.

Shows:
- Display name
- Admin badge
- Last seen
- Push subscription count

Actions:
- Enable/disable members

### /admin/bulletins
**Bulletins**

Moderate the bulletin board.

Shows:
- All active bulletins
- Author, timestamp, expiry
- Reply count

Actions:
- Remove bulletin (soft delete)

### /admin/invite-codes
**Invite Codes**

Generate and manage invite codes.

Create options:
- Max uses (default 1)
- Expiry days (0 = never)

Shows:
- Code string
- Usage count
- Created date
- Expiry date

Actions:
- Copy code
- Revoke code

## API Endpoints Used

| Route | Endpoint | Method |
|-------|----------|--------|
| drop-recipe | `/api/admin/drop-recipe` | POST |
| drop-recipe | `/api/recipes/cache` | GET, POST |
| club-call | `/api/admin/club-call` | POST |
| shelf | `/api/recipes/shelf` | GET, POST, PATCH, DELETE |
| shelf | `/api/collections` | GET, POST |
| members | `/api/members` | GET |
| members | `/api/members/:id` | PATCH |
| bulletins | `/api/bulletins` | GET |
| bulletins | `/api/bulletins/:id` | DELETE |
| invite-codes | `/api/admin/invite-codes` | GET, POST |
| invite-codes | `/api/admin/invite-codes/:id` | DELETE |

## Security

All admin routes require:
1. Valid session cookie
2. Member with `is_admin = 1`

Unauthorized access returns 401 or 403.
