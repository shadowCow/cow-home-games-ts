---
paths: "**/*.{tsx}"
---

# React Style Guide

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
