# Plan to Link Hero Section to Collection Page

This document outlines the steps taken to link the Hero Section on the home page to the corresponding collection page, and to fix related issues on the collection page itself.

## 1. Update Home Page (`app/(shop)/(tabs)/index.tsx`)

- **Modify Hero Section Data Fetching:**
  - The `useEffect` hook was changed to fetch the most recent category from the `categories` table in Supabase.
  - The `heroCollection` state is now populated with the ID, name, and image of this category. This replaces the old logic that incorrectly fetched a single product.

- **Update Hero Section Link:**
  - The `onPress` event for the Hero Section `TouchableOpacity` was updated.
  - It now navigates to `/collection/[id]`, passing the ID of the fetched category. The previous implementation incorrectly linked to a product page.

## 2. Fix and Update Collection Page (`app/(shop)/collection/[id].tsx`)

- **Correct Data Fetching Logic:**
  - The `fetchCollectionData` function was updated to query the `categories` table instead of the non-existent `collections` table.
  - The query to fetch products was corrected to filter by `category_id` instead of `collection_id` to align with the database schema.

- **Fix Data Mapping:**
  - Corrected an issue where product prices were being formatted with `toLocalString()` instead of `toLocaleString()`.
  - Fixed the logic for retrieving product images to correctly use the `images` array from the product data, preventing crashes if the image data is missing.

- **Fix Component Rendering Logic:**
  - The component's structure was corrected to properly handle the `loading` state.
  - An `ActivityIndicator` is now displayed while data is being fetched.
  - The main component content is rendered only after the loading is complete, fixing a critical bug that caused the component to only render *during* the loading phase.

- **Fix Product Link:**
  - Corrected a bug in the `ProductCard` component where the `onPress` handler used incorrect string interpolation (`''` instead of ` `` `), which would have prevented links to product detail pages from working.