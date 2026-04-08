import { DEFAULT_PROFILE_SETTINGS, PROFILE_SETTINGS_PAGE_KEY } from "../../lib/profile/constants";

export const profileSettingsClientConfig = {
  pageKey: PROFILE_SETTINGS_PAGE_KEY,
  defaultProfileSettingsJson: JSON.stringify(DEFAULT_PROFILE_SETTINGS),
};
