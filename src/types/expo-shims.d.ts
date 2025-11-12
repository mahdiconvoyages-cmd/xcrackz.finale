// Ambient module shims to silence TS2307 when web typecheck runs without RN/Expo packages installed
declare module 'expo-print';
declare module 'expo-sharing';
declare module 'expo-image-manipulator';
declare module 'expo-linear-gradient';
declare module 'expo-image-picker';
declare module 'expo-location';
declare module 'expo-task-manager';
declare module 'expo-notifications';
declare module 'expo-speech';
declare module '@react-native-async-storage/async-storage';
declare module 'react-native-maps';
declare module '@rnmapbox/maps';
declare module 'pdf-lib';
declare module 'react-native-onesignal';
// Navigation (prefer official types if installed)
declare module '@react-navigation/native';
// Supabase JS config shim (local JS file)
declare module '../config/supabase' {
	export const supabase: any;
}
