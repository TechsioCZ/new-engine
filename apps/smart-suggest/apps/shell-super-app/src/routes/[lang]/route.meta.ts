const routeMeta = {
  canonicalPath: '/en',
  descriptionKey: 'shell.seo.description',
  id: 'shell-home',
  indexable: false,
  localisedPaths: {
    cs: '/cs',
    en: '/en',
  },
  mfBoundaryId: 'shellSuperApp',
  namespace: 'shell',
  ownerAppId: 'shell-super-app',
  public: false,
  publicSurface: 'private-app-screen',
  titleKey: 'shell.title',
} as const;

export default routeMeta;
export { routeMeta };
