const routeMeta = {
  canonicalPath: '/settings',
  descriptionKey: 'shell.settings.description',
  id: 'shell-settings',
  indexable: false,
  localisedPaths: {
    cs: '/nastaveni',
    en: '/settings',
  },
  mfBoundaryId: 'shellSuperApp',
  namespace: 'shell',
  ownerAppId: 'shell-super-app',
  public: false,
  publicSurface: 'private-app-screen',
  titleKey: 'shell.settings.title',
} as const;

export default routeMeta;
export { routeMeta };
