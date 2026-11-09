// One libraries array for every Maps loader in the app. useJsApiLoader throws ('Loader must not be called again with different options') if two components pass different arrays, so ProjectMap and the Public_Plot_Page share this constant.
export const MAP_LIBRARIES: ('places' | 'geometry' | 'marker')[] = ['places', 'geometry', 'marker'];
