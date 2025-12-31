---
paths: "**/*.{tsx,css}"
---

# React Style Guide

## Component Organization

- **Each component gets its own folder** with the name of the component as the folder name
- The folder contains the component file and its CSS module file

  ```
  // ✓ Good structure
  ui/
    common/
      Button/
        Button.tsx
        Button.module.css
      TextField/
        TextField.tsx
        TextField.module.css
    LoginPage/
      LoginPage.tsx
      LoginPage.module.css
  ```

## Component Props

- **Define props types inline on the component, not as separate types**
- **Do not destructure props** - use `props.property` syntax throughout the component

  ```typescript
  // ✓ Good
  function MyComponent(props: { name: string; age: number }) {
    return <div>Hello {props.name}, you are {props.age}</div>;
  }

  // ✗ Avoid
  type MyComponentProps = {
    name: string;
    age: number;
  };

  function MyComponent({ name, age }: MyComponentProps) {
    return <div>Hello {name}, you are {age}</div>;
  }
  ```

## CSS Modules

- **Use CSS Modules for component styling**
- Each component should have a companion CSS module file with the same name
- File naming: `ComponentName.tsx` → `ComponentName.module.css`
- **Exception:** `global.css` is the only non-module CSS file
  - Used for CSS variables (theme colors, etc.)
  - Used for CSS resets
  - Palette colors (prefixed with `--palette-`) are internal to `global.css` only
  - Theme colors (prefixed with `--color-`) are for use throughout the app

  ```
  // ✓ Good structure
  ui/
    LoginPage.tsx
    LoginPage.module.css
    App.tsx
    App.module.css
  global.css

  // ✓ In global.css
  :root {
    --palette-primary-base: rgb(141, 101, 215);  /* Internal only */
    --color-primary: var(--palette-primary-base); /* Use in app */
  }

  // ✓ In LoginPage.module.css
  .container {
    background-color: var(--color-primary);
  }

  // ✓ In LoginPage.tsx
  import styles from './LoginPage.module.css';

  export function LoginPage(props: { ... }) {
    return <div className={styles.container}>...</div>;
  }
  ```
