export const buildMediaItems = (project: any) => {
  return [
    ...(project?.coverImage
      ? [{ type: "image", src: project.coverImage }]
      : []),

    ...(project?.galleryImages || []).map((src: string) => ({
      type: "image",
      src,
    })),

    ...(project?.videos || []).map((src: string) => ({
      type: "video",
      src,
    })),

    ...(project?.brochureUrl
      ? [{ type: "brochure", src: project.brochureUrl }]
      : []),
  ];
};