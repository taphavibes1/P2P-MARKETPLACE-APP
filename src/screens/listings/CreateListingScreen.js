import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Image, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, FlatList, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { createListing } from '../../services/listingsService';
import { uploadListingImages } from '../../services/storageService';
import { useGeofence } from '../../hooks/useGeofence';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { CATEGORIES, VERIFICATION_STATUS } from '../../constants';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';

const MAX_PHOTOS = 4;

export default function CreateListingScreen({ navigation }) {
  const { user, userProfile } = useAuth();
  const { checkLocation, checking: checkingLocation } = useGeofence();
  const { toast, showToast, hideToast } = useToast();

  const [form, setForm] = useState({
    title: '',
    description: '',
    price: '',
    category: CATEGORIES[0].id,
  });
  const [photos, setPhotos] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  const set = (k) => (v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const isVerified = userProfile?.verificationStatus === VERIFICATION_STATUS.VERIFIED;

  const pickPhoto = async (fromCamera) => {
    if (photos.length >= MAX_PHOTOS) {
      showToast(`Maximum ${MAX_PHOTOS} photos allowed`, 'warning');
      return;
    }

    const permResult = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permResult.status !== 'granted') {
      showToast('Permission denied. Please enable it in Settings.', 'error');
      return;
    }

    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, allowsEditing: true, aspect: [4, 3] })
      : await ImagePicker.launchImageLibraryAsync({
          quality: 0.8,
          allowsEditing: true,
          aspect: [4, 3],
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          selectionLimit: MAX_PHOTOS - photos.length,
        });

    if (!result.canceled) {
      const uris = result.assets.map(a => a.uri);
      setPhotos(prev => [...prev, ...uris].slice(0, MAX_PHOTOS));
    }
  };

  const removePhoto = (index) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const validate = () => {
    const e = {};
    if (!form.title.trim()) e.title = 'Title is required';
    else if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (!form.price.trim()) e.price = 'Price is required';
    else if (isNaN(Number(form.price)) || Number(form.price) <= 0) e.price = 'Enter a valid price';
    if (!form.description.trim()) e.description = 'Description is required';
    else if (form.description.trim().length < 10) e.description = 'Description must be at least 10 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!isVerified) {
      showToast('Your account must be verified to post listings.', 'error');
      return;
    }
    if (!validate()) return;

    setSubmitting(true);

    // 1. Geofence check
    const geoResult = await checkLocation();
    if (!geoResult.ok) {
      showToast(geoResult.error, 'error');
      setSubmitting(false);
      return;
    }

    try {
      // 2. Upload photos — skip silently if Storage isn't enabled
      let imageUrls = [];
      if (photos.length > 0) {
        try {
          showToast('Uploading photos...', 'info');
          imageUrls = await uploadListingImages(photos, user.uid);
        } catch (uploadErr) {
          console.warn('Photo upload skipped:', uploadErr?.message);
          showToast('Photos skipped (Storage not enabled). Listing will post without images.', 'warning');
        }
      }

      // 3. Create listing document
      await createListing(
        {
          title: form.title.trim(),
          description: form.description.trim(),
          price: Number(form.price),
          category: form.category,
          imageUrls,
          sellerName: userProfile.name,
          location: {
            latitude: geoResult.coords.latitude,
            longitude: geoResult.coords.longitude,
          },
          locationLabel: 'Ugbowo, UNIBEN',
        },
        user.uid,
      );

      showToast('Listing posted successfully!', 'success');
      setTimeout(() => navigation.goBack(), 1200);
    } catch (err) {
      console.error('Create listing error:', err);
      const msg = err?.code === 'permission-denied'
        ? 'Permission denied — make sure Firestore rules allow writes (set test mode in Firebase Console).'
        : `Failed to post: ${err?.message ?? err}`;
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.id === form.category);

  // Unverified gate
  if (!isVerified) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Sell an Item</Text>
        </View>
        <View style={styles.gateContainer}>
          <Ionicons name="lock-closed" size={64} color={COLORS.textDisabled} />
          <Text style={styles.gateTitle}>Verification Required</Text>
          <Text style={styles.gateMessage}>
            You need a verified student ID to post listings. Upload your ID and wait for approval — it usually takes under 24 hours.
          </Text>
          <TouchableOpacity
            style={styles.gateBtn}
            onPress={() => navigation.navigate('UploadId')}
          >
            <Text style={styles.gateBtnText}>Upload Student ID</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const isLoading = submitting || checkingLocation;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Sell an Item</Text>
          <TouchableOpacity
            style={[styles.postBtn, isLoading && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.postBtnText}>
                  {checkingLocation ? 'Locating...' : 'Post'}
                </Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Photo picker */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>
              Photos <Text style={styles.sectionHint}>({photos.length}/{MAX_PHOTOS})</Text>
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {photos.map((uri, i) => (
                <View key={i} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.thumbImage} resizeMode="cover" />
                  <TouchableOpacity style={styles.removePhoto} onPress={() => removePhoto(i)}>
                    <Ionicons name="close-circle" size={20} color={COLORS.error} />
                  </TouchableOpacity>
                  {i === 0 && (
                    <View style={styles.coverBadge}>
                      <Text style={styles.coverBadgeText}>Cover</Text>
                    </View>
                  )}
                </View>
              ))}
              {photos.length < MAX_PHOTOS && (
                <TouchableOpacity style={styles.addPhotoBtn} onPress={() => pickPhoto(false)}>
                  <Ionicons name="camera-outline" size={28} color={COLORS.textDisabled} />
                  <Text style={styles.addPhotoText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
            <View style={styles.photoActions}>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickPhoto(true)}>
                <Ionicons name="camera" size={16} color={COLORS.primary} />
                <Text style={styles.photoActionText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoActionBtn} onPress={() => pickPhoto(false)}>
                <Ionicons name="images" size={16} color={COLORS.primary} />
                <Text style={styles.photoActionText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Title */}
          <View style={styles.section}>
            <Text style={styles.label}>Title <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.input, errors.title && styles.inputError]}
              placeholder="e.g. 200 Level Engineering Textbook"
              placeholderTextColor={COLORS.textDisabled}
              value={form.title}
              onChangeText={set('title')}
              maxLength={80}
            />
            <View style={styles.inputFooter}>
              {errors.title
                ? <Text style={styles.errorText}>{errors.title}</Text>
                : <Text style={styles.charCount}>{form.title.length}/80</Text>}
            </View>
          </View>

          {/* Price */}
          <View style={styles.section}>
            <Text style={styles.label}>Price (₦) <Text style={styles.required}>*</Text></Text>
            <View style={[styles.priceRow, errors.price && styles.inputError]}>
              <Text style={styles.currencySymbol}>₦</Text>
              <TextInput
                style={styles.priceInput}
                placeholder="0.00"
                placeholderTextColor={COLORS.textDisabled}
                value={form.price}
                onChangeText={(v) => {
                  if (/^\d*\.?\d{0,2}$/.test(v)) set('price')(v);
                }}
                keyboardType="decimal-pad"
              />
            </View>
            {errors.price && <Text style={styles.errorText}>{errors.price}</Text>}
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.label}>Category <Text style={styles.required}>*</Text></Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setCategoryModalVisible(true)}
            >
              <View style={styles.categorySelected}>
                <Ionicons name={`${selectedCategory?.icon}-outline`} size={18} color={COLORS.primary} />
                <Text style={styles.selectBtnText}>{selectedCategory?.label}</Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.label}>Description <Text style={styles.required}>*</Text></Text>
            <TextInput
              style={[styles.textArea, errors.description && styles.inputError]}
              placeholder="Describe your item — condition, age, any defects, reason for selling..."
              placeholderTextColor={COLORS.textDisabled}
              value={form.description}
              onChangeText={set('description')}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
              maxLength={500}
            />
            <View style={styles.inputFooter}>
              {errors.description
                ? <Text style={styles.errorText}>{errors.description}</Text>
                : <Text style={styles.charCount}>{form.description.length}/500</Text>}
            </View>
          </View>

          {/* Geofence notice */}
          <View style={styles.geoNotice}>
            <Ionicons name="location" size={16} color={COLORS.primary} />
            <Text style={styles.geoNoticeText}>
              Your device must be within Ugbowo campus when you post. Location is only used to verify you're on campus — only a neighbourhood-level label is stored, not your precise coordinates.
            </Text>
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Category modal */}
      <Modal
        visible={categoryModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setCategoryModalVisible(false)}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Category</Text>
            <FlatList
              data={CATEGORIES}
              keyExtractor={item => item.id}
              renderItem={({ item }) => {
                const active = form.category === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.modalItem, active && styles.modalItemSelected]}
                    onPress={() => { set('category')(item.id); setCategoryModalVisible(false); }}
                  >
                    <View style={styles.modalItemLeft}>
                      <Ionicons
                        name={active ? item.icon : `${item.icon}-outline`}
                        size={20}
                        color={active ? COLORS.primary : COLORS.textSecondary}
                      />
                      <Text style={[styles.modalItemText, active && styles.modalItemTextActive]}>
                        {item.label}
                      </Text>
                    </View>
                    {active && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.md,
    paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    ...SHADOWS.small,
  },
  backBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginLeft: SIZES.sm },
  postBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.lg,
    paddingVertical: SIZES.sm,
    minWidth: 64,
    alignItems: 'center',
    ...SHADOWS.small,
  },
  postBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  scroll: { padding: SIZES.md, gap: SIZES.md },
  section: { gap: 6 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  sectionHint: { fontSize: 12, color: COLORS.textSecondary, fontWeight: '400' },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  required: { color: COLORS.error },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  inputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  errorText: { fontSize: 12, color: COLORS.error },
  charCount: { fontSize: 11, color: COLORS.textDisabled, marginLeft: 'auto' },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },
  currencySymbol: {
    paddingHorizontal: SIZES.md,
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingVertical: SIZES.md,
  },
  priceInput: { flex: 1, padding: SIZES.md, fontSize: 18, fontWeight: '700', color: COLORS.textPrimary },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    backgroundColor: COLORS.surface,
  },
  categorySelected: { flexDirection: 'row', alignItems: 'center', gap: SIZES.sm },
  selectBtnText: { fontSize: 15, color: COLORS.textPrimary },
  textArea: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface,
    minHeight: 120,
  },
  photoRow: { gap: SIZES.sm, paddingBottom: SIZES.sm },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: SIZES.borderRadius,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbImage: { width: '100%', height: '100%' },
  removePhoto: { position: 'absolute', top: 4, right: 4, backgroundColor: '#FFF', borderRadius: 10 },
  coverBadge: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(26,35,126,0.75)',
    paddingVertical: 3,
    alignItems: 'center',
  },
  coverBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '600' },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: SIZES.borderRadius,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    gap: 4,
  },
  addPhotoText: { fontSize: 10, color: COLORS.textDisabled },
  photoActions: { flexDirection: 'row', gap: SIZES.md },
  photoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: SIZES.xs,
  },
  photoActionText: { fontSize: 13, color: COLORS.primary, fontWeight: '500' },
  geoNotice: {
    flexDirection: 'row',
    gap: SIZES.sm,
    backgroundColor: '#E8EAF6',
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    alignItems: 'flex-start',
  },
  geoNoticeText: { flex: 1, fontSize: 12, color: COLORS.primary, lineHeight: 18 },
  // Unverified gate
  gateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.xl,
    gap: SIZES.md,
  },
  gateTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  gateMessage: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  gateBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.xl,
    paddingVertical: SIZES.md,
    marginTop: SIZES.sm,
    ...SHADOWS.small,
  },
  gateBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
  // Category modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg,
    paddingBottom: SIZES.xl,
  },
  modalHandle: {
    width: 40, height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: SIZES.sm,
    marginBottom: SIZES.md,
  },
  modalTitle: {
    fontSize: 16, fontWeight: '700',
    color: COLORS.textPrimary,
    paddingHorizontal: SIZES.lg,
    marginBottom: SIZES.sm,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SIZES.md,
    paddingHorizontal: SIZES.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },
  modalItemSelected: { backgroundColor: '#E8EAF6' },
  modalItemLeft: { flexDirection: 'row', alignItems: 'center', gap: SIZES.md },
  modalItemText: { fontSize: 15, color: COLORS.textPrimary },
  modalItemTextActive: { color: COLORS.primary, fontWeight: '600' },
});
