import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet,
  ActivityIndicator, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { storage, db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';

export default function UploadIdScreen({ navigation }) {
  const { user, refreshProfile } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [imageUri, setImageUri] = useState(null);
  const [uploading, setUploading] = useState(false);

  const pickImage = async (fromCamera) => {
    const permResult = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permResult.status !== 'granted') {
      showToast('Permission denied. Please enable it in Settings.', 'error');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
        });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleUpload = async () => {
    if (!imageUri) {
      showToast('Please select an image first', 'warning');
      return;
    }
    setUploading(true);
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const storageRef = ref(storage, `student_ids/${user.uid}_${Date.now()}.jpg`);
      await uploadBytes(storageRef, blob);
      const downloadUrl = await getDownloadURL(storageRef);
      await updateDoc(doc(db, 'users', user.uid), {
        studentIdImageUrl: downloadUrl,
        verificationStatus: 'pending',
      });
      await refreshProfile();
      showToast('Student ID submitted! We will review it shortly.', 'success');
      setTimeout(() => navigation.replace('MainTabs'), 2000);
    } catch (err) {
      showToast('Upload failed. Please try again.', 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Ionicons name="shield-checkmark" size={48} color={COLORS.primary} />
          <Text style={styles.title}>Verify Your Student ID</Text>
          <Text style={styles.subtitle}>
            Upload a clear photo of your UNIBEN student ID card. We review IDs within 24 hours.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.uploadBox, imageUri && styles.uploadBoxFilled]}
          onPress={() => pickImage(false)}
        >
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <>
              <Ionicons name="cloud-upload-outline" size={48} color={COLORS.textDisabled} />
              <Text style={styles.uploadText}>Tap to choose from gallery</Text>
              <Text style={styles.uploadHint}>or use a button below to take a photo</Text>
            </>
          )}
        </TouchableOpacity>

        <View style={styles.btnRow}>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => pickImage(true)}>
            <Ionicons name="camera" size={20} color={COLORS.primary} />
            <Text style={styles.outlineBtnText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.outlineBtn} onPress={() => pickImage(false)}>
            <Ionicons name="images" size={20} color={COLORS.primary} />
            <Text style={styles.outlineBtnText}>Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <TouchableOpacity
            style={[styles.submitBtn, uploading && styles.btnDisabled]}
            onPress={handleUpload}
            disabled={uploading}
          >
            {uploading
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.submitBtnText}>Submit for Verification</Text>}
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.skipBtn} onPress={() => navigation.replace('MainTabs')}>
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </ScrollView>
      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, padding: SIZES.lg },
  header: { alignItems: 'center', marginBottom: SIZES.xl, gap: SIZES.sm },
  title: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center' },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadiusLg,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    gap: SIZES.sm,
    overflow: 'hidden',
  },
  uploadBoxFilled: { borderStyle: 'solid', borderColor: COLORS.primary },
  preview: { width: '100%', height: '100%' },
  uploadText: { fontSize: 15, color: COLORS.textSecondary, fontWeight: '500' },
  uploadHint: { fontSize: 13, color: COLORS.textDisabled },
  btnRow: { flexDirection: 'row', gap: SIZES.md, marginTop: SIZES.md },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SIZES.sm,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
  },
  outlineBtnText: { color: COLORS.primary, fontWeight: '600' },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.lg,
    ...SHADOWS.small,
  },
  btnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  skipBtn: { alignItems: 'center', marginTop: SIZES.md, padding: SIZES.md },
  skipText: { color: COLORS.textSecondary, fontSize: 14 },
});
