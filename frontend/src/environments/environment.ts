// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  // Plain HTTP for local dev — avoids the ASP.NET Core dev HTTPS cert trust
  // dance (especially painful on Linux); see CONCEPT.md §6. `dotnet run`
  // without an explicit --launch-profile also lands on the "http" profile
  // (http://localhost:5147), matching this.
  apiUrl: 'http://localhost:5147/api',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
