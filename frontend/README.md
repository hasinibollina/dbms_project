# Eventilion — Frontend

Frontend application for the **Eventilion** Event Management System, built with **React**, **Vite**, and **Tailwind CSS**.

## Design System
- **Colors**:
  - `wine`: `#7F011F` (primary: navbar, hero, buttons, accents)
  - `sand`: `#F5EBD0` (page background, card backgrounds on wine)
  - `wine-dark`: `#5C0116` (hover states, footer)
  - `wine-light`: `#A3243F` (focus rings, badges)
  - `sand-dark`: `#E8D9B5` (borders, skeleton loaders, dividers)
  - `ink`: `#2B0A12` (dark body text on sand)
- **Typography**:
  - Headings: `Archivo Black` (uppercase, tight letter spacing, poster-style)
  - Body: `Inter`

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
The application reads the backend URL from `VITE_API_URL`.
By default, if unspecified, it connects to:
```
http://localhost:8000
```
To override, create a `.env` file (see `.env.example`):
```bash
VITE_API_URL=http://localhost:8000
```

### 3. Run Development Server
```bash
npm run dev
```

### 4. Build for Production
```bash
npm run build
```
