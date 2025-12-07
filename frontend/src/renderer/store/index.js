import { configureStore } from '@reduxjs/toolkit';
import timelineReducer from './timelineSlice';
import assetsReducer from './assetsSlice';
import exportReducer from './exportSlice';
import projectReducer from './projectSlice';
import randomLayerReducer from './randomLayerSlice';

export const store = configureStore({
  reducer: {
    timeline: timelineReducer,
    assets: assetsReducer,
    export: exportReducer,
    project: projectReducer,
    randomLayers: randomLayerReducer,
  },
});
