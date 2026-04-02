import { page } from '../../lib/ui/page-factories';
export default page({
  id: 'settings-profile', route: '/settings/profile', title: 'Profile Settings',
  hero: { kicker: 'Settings', title: 'Profile Settings' },
  sections: [
    { id: 'account-actions', type: 'settings', title: 'Account Actions', actions: [{ id: 'change-password', kind: 'change-password', label: 'Change Password' }, { id: 'upload-file', kind: 'upload', label: 'Upload file' }, { id: 'clear-avatar', kind: 'clear', label: 'Clear avatar' }, { id: 'refresh-preview', kind: 'refresh-preview', label: 'Refresh Preview' }, { id: 'save-profile-settings', kind: 'save', label: 'Save Profile Settings' }] },
  ],
});
