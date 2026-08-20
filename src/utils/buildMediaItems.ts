export const buildMediaItems = (project: any) => {
  const getUrl = (val: any) => (typeof val === 'object' && val !== null ? val.url : val);

  return [
    ...(project?.coverImage
      ? [{ type: "image", src: getUrl(project.coverImage) }]
      : []),

    ...(project?.galleryImages || []).map((img: any) => ({
      type: "image",
      src: getUrl(img),
    })),

    ...(project?.videos || []).map((vid: any) => ({
      type: "video",
      src: getUrl(vid),
    })),

    ...(project?.brochureUrl
      ? [{ type: "brochure", src: getUrl(project.brochureUrl) }]
      : []),
  ];
};