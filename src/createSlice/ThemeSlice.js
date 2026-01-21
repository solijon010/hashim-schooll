import { createSlice } from "@reduxjs/toolkit";

const ThemeSlice = createSlice({
  name: "Theme",
  initialState: {
    value: localStorage.getItem("theme") || "dark",
  },
  reducers: {
    changeTheme: (state, { payload }) => {
      state.value = payload;
      localStorage.setItem("theme", payload);
    },
  },
});

export const { changeTheme } = ThemeSlice.actions;
export default ThemeSlice.reducer;
