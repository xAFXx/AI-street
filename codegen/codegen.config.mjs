/**
 * OpenAPI Code Generation Configuration
 *
 * Defines which API controllers/tags to generate types for,
 * and where to output the generated files.
 *
 * Each entry maps a backend controller tag to a feature module.
 */

/**
 * Default Swagger URL (local backend).
 * The backend groups swagger specs by module, e.g.:
 *   - http://localhost:5000/swagger/Apps/swagger.json   (App Store)
 *   - https://dev_ihsc-connectapi.apprx.eu/swagger/Apps/swagger.json (Dev)
 */
export const DEFAULT_SWAGGER_URL = 'http://localhost:5000/swagger/Apps/swagger.json';

/**
 * Feature module mappings.
 *
 * Each entry tells the generator:
 *  - tags: Which Swagger operation tags to include (matches controller names)
 *  - output: Where to write the generated types file
 *  - description: Human-readable label for console output
 *
 * Add new entries here when migrating additional features.
 */
export const features = [
    {
        tags: ['AppStore'],
        output: 'src/app/features/app-store/api/generated-types.ts',
        description: 'App Store'
    },
    {
        tags: ['VDB'],
        output: 'src/app/features/app-store/apps/vdb-manager/api/generated-types.ts',
        description: 'Virtual Database'
    },
];
