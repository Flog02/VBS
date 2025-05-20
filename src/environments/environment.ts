// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.
export const environment = {
  production: false,
  firebase: {
    apiKey: "AIzaSyAEQDoqlVgJv07ie8--U_TEveH9606tdB4",
    authDomain: "vbs-lale.firebaseapp.com",
    databaseURL: "https://vbs-lale-default-rtdb.firebaseio.com",
    projectId: "vbs-lale",
    storageBucket: "vbs-lale.firebasestorage.app", 
    messagingSenderId: "606319517771",
    appId: "1:606319517771:web:6c8b3b585d7b1762902dce",
    measurementId: "G-28V5SG3J5R"
  },
  xrweb: {
    appKey: "YOUR_8THWALL_APP_KEY" // Kept original 8thWall key value
  }
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
