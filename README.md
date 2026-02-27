# GridWorks Web Front-End

This is the front-end of the GridWorks web application for managing our fleet of space heating installations.

## Technology Stack

* The code is TypeScript and CSS
* React is used as a UI framework
* Bootstrap (via `react-boostrap`) is used for look-and-feel and some standard web app functionality
* Axios is used as a HTTP request library
* Vite (which runs on the NodeJS platform) is used as the development server and build system
* ESLint is used for static code analysis

## Developing

Run `npm run dev` from the terminal, which will serve the site on your localhost.
Hot module reload is enabled, so any changes you make to the code will reflect immediately.

### Mock API Responses

API responses are currently mocked via `vite-plugin-mock-dev-server`.
This allows us to write out mock JSON responses or HTTP status codes, rather than calling our real APIs.
These mocks are contained in the `mock` folder.

### Strict Mode & Double-Rendering

Note that since we are using React in "strict mode", our components will get unmounted and then re-mounted (and re-rendered) in development mode.
This is a feature to help us find bugs, but it sometimes a bit confusing while debugging code or observing network calls.
You can temporarily turn this off by removing the `<StrictMode>` element in `main.tsx`.

## Building

TODO -- Vite can build the app into a bundle of static files that can be served by a static web server.

## TODO (as recommended by the Vite template) - Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
