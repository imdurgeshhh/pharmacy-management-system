# Medical Shop Management System - Green & White Theme Plan

## Information Gathered

After analyzing all frontend files, I have identified:

1. **Current Theme**: Uses blue/emerald color palette with custom CSS variables
2. **Files to Modify**:
   - `tailwind.config.js` - Color palette configuration
   - `src/index.css` - CSS variables and base styles
   - `src/components/Header.jsx` - Navbar styling
   - `src/components/Sidebar.jsx` - Sidebar menu styling
   - `src/pages/Dashboard.jsx` - Dashboard cards and charts
   - `src/pages/Login.jsx` - Login page styling
   - `src/pages/Inventory.jsx` - Inventory table styling
   - `src/pages/POS.jsx` - Point of Sale styling
   - `src/pages/Purchases.jsx` - Purchase order styling
   - `src/pages/Reports.jsx` - Reports table styling
   - `src/pages/Suppliers.jsx` - Supplier management styling

## Plan

### Step 1: Update tailwind.config.js
- Replace blue/emerald colors with green medical palette:
  - Primary Green: #2E7D32 (rgb: 46 125 50)
  - Light Green: #4CAF50 (rgb: 76 175 80)
  - Background White: #FFFFFF
  - Soft Background: #F5F9F6
  - Text Dark: #1F2937
  - Border Color: #E5E7EB

### Step 2: Update index.css
- Replace CSS variables with green palette
- Update button styles (primary/secondary)
- Update form input focus states
- Update card-glass component with green accents

### Step 3: Update Header.jsx
- Keep white background
- Update icons to medical-themed (Package, Bell, User, LogOut)
- Use green for active states

### Step 4: Update Sidebar.jsx
- Change background to light green (#F5F9F6)
- Update active menu item to darker green (#2E7D32)
- Update logo/pharmacy icon styling

### Step 5: Update Dashboard.jsx
- Update StatCard colors to use green gradients
- Keep chart styling with green theme
- Update alert panels with appropriate colors

### Step 6: Update Login.jsx
- Keep green accent colors
- Update focus states to green

### Step 7: Update Inventory.jsx
- Update table header to green
- Update stock badges (green for good, orange for low, red for critical)

### Step 8: Update POS.jsx
- Update search box focus to green
- Update cart item styling

### Step 9: Update Purchases.jsx
- Update scanner panel styling
- Update table headers

### Step 10: Update Reports.jsx
- Update table headers to green
- Keep sales (green) and purchases (can stay or change)

### Step 11: Update Suppliers.jsx
- Update form styling with green focus states

## Followup Steps

1. Run `npm run dev` in frontend to test changes
2. Verify all pages load correctly
3. Test responsive behavior
4. Ensure all hover/focus states work properly

