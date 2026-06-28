# Workshop Images Setup

## How to Add Your Workshop Images

### Step 1: Prepare Your Images
- **Tray Garden image**: `tray-garden.jpg` (recommended size: 800x600px or similar)
- **Terrarium Garden image**: `terrarium-garden.jpg` (recommended size: 800x600px or similar)

### Step 2: Copy Images to Public Folder
Copy your images to:
```
/Users/mac/Documents/GitHub/xylproject/xylem-landscape/public/
```

So the final paths will be:
- `/public/tray-garden.jpg`
- `/public/terrarium-garden.jpg`

### Step 3: Images Will Appear Automatically
Once you place the images in the public folder, they will automatically appear on:
- **Workshop Showcase Page**: `http://localhost:3000/workshops`

### Supported Image Formats
- `.jpg` / `.jpeg`
- `.png`
- `.webp`
- `.gif`

### Image Specifications
- **Recommended resolution**: 800x600px or higher
- **Aspect ratio**: 4:3 works best for the cards
- **File size**: Keep under 2MB for faster loading

### Current Image Configuration
The workshop cards are set up to use these images:

**Tray Garden**:
- File: `public/tray-garden.jpg`
- Display height: 192px (on the card)

**Terrarium Garden**:
- File: `public/terrarium-garden.jpg`
- Display height: 192px (on the card)

### If Images Don't Appear
1. Clear the browser cache (Ctrl+Shift+Del or Cmd+Shift+Del)
2. Restart the dev server: `npm run dev`
3. Check that image files are in `/public/` folder

### To Change Image Names
If you want to use different image filenames:
1. Edit `/app/workshops/page.tsx`
2. Find the `image:` property in the workshops array
3. Change the path to match your image filename
4. Save and restart the dev server

That's it! Your workshop images will now display on the showcase page. 🎨
