/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actionItems from "../actionItems.js";
import type * as cohorts from "../cohorts.js";
import type * as dashboard from "../dashboard.js";
import type * as demoDays from "../demoDays.js";
import type * as directory from "../directory.js";
import type * as fellows from "../fellows.js";
import type * as impersonation from "../impersonation.js";
import type * as invites from "../invites.js";
import type * as lib_actionItemsHelpers from "../lib/actionItemsHelpers.js";
import type * as lib_appAccess from "../lib/appAccess.js";
import type * as lib_assignments from "../lib/assignments.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_cohortScope from "../lib/cohortScope.js";
import type * as lib_cohortSettings from "../lib/cohortSettings.js";
import type * as lib_customFunctions from "../lib/customFunctions.js";
import type * as lib_dates from "../lib/dates.js";
import type * as lib_groups from "../lib/groups.js";
import type * as lib_impersonation from "../lib/impersonation.js";
import type * as lib_inviteAcceptance from "../lib/inviteAcceptance.js";
import type * as lib_migrateProgramDates from "../lib/migrateProgramDates.js";
import type * as lib_programCode from "../lib/programCode.js";
import type * as lib_programWeeks from "../lib/programWeeks.js";
import type * as lib_validators from "../lib/validators.js";
import type * as lightningTalks from "../lightningTalks.js";
import type * as mentors from "../mentors.js";
import type * as oneOnOnes from "../oneOnOnes.js";
import type * as seed from "../seed.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  actionItems: typeof actionItems;
  cohorts: typeof cohorts;
  dashboard: typeof dashboard;
  demoDays: typeof demoDays;
  directory: typeof directory;
  fellows: typeof fellows;
  impersonation: typeof impersonation;
  invites: typeof invites;
  "lib/actionItemsHelpers": typeof lib_actionItemsHelpers;
  "lib/appAccess": typeof lib_appAccess;
  "lib/assignments": typeof lib_assignments;
  "lib/auth": typeof lib_auth;
  "lib/cohortScope": typeof lib_cohortScope;
  "lib/cohortSettings": typeof lib_cohortSettings;
  "lib/customFunctions": typeof lib_customFunctions;
  "lib/dates": typeof lib_dates;
  "lib/groups": typeof lib_groups;
  "lib/impersonation": typeof lib_impersonation;
  "lib/inviteAcceptance": typeof lib_inviteAcceptance;
  "lib/migrateProgramDates": typeof lib_migrateProgramDates;
  "lib/programCode": typeof lib_programCode;
  "lib/programWeeks": typeof lib_programWeeks;
  "lib/validators": typeof lib_validators;
  lightningTalks: typeof lightningTalks;
  mentors: typeof mentors;
  oneOnOnes: typeof oneOnOnes;
  seed: typeof seed;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
