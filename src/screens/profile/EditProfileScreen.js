import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
  Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase/config';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { DEPARTMENTS } from '../../constants';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';

export default function EditProfileScreen({ navigation }) {
  const { user, userProfile, refreshProfile } = useAuth();
  const { toast, showToast, hideToast } = useToast();

  const [form, setForm] = useState({
    name: userProfile?.name ?? '',
    phone: userProfile?.phone ?? '',
    department: userProfile?.department ?? DEPARTMENTS[0],
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deptModal, setDeptModal] = useState(false);

  const set = (k) => (v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Name is required';
    if (!form.phone.trim()) e.phone = 'Phone is required';
    else if (!/^(\+?234|0)\d{10}$/.test(form.phone.replace(/\s/g, '')))
      e.phone = 'Enter a valid Nigerian phone number';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        name: form.name.trim(),
        phone: form.phone.trim(),
        department: form.department,
      });
      await refreshProfile();
      showToast('Profile updated successfully', 'success');
      setTimeout(() => navigation.goBack(), 1000);
    } catch {
      showToast('Could not save changes. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Edit Profile</Text>
          <TouchableOpacity
            style={[styles.saveBtn, saving && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving
              ? <ActivityIndicator size="small" color="#FFF" />
              : <Text style={styles.saveBtnText}>Save</Text>}
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.field}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={form.name}
              onChangeText={set('name')}
              placeholder="Your full name"
              placeholderTextColor={COLORS.textDisabled}
              autoCapitalize="words"
            />
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, errors.phone && styles.inputError]}
              value={form.phone}
              onChangeText={set('phone')}
              placeholder="08012345678"
              placeholderTextColor={COLORS.textDisabled}
              keyboardType="phone-pad"
            />
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Department</Text>
            <TouchableOpacity
              style={styles.selectBtn}
              onPress={() => setDeptModal(true)}
            >
              <Text style={styles.selectBtnText}>{form.department}</Text>
              <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.disabledField}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.disabledInput}>
              <Text style={styles.disabledText}>{userProfile?.email}</Text>
              <Ionicons name="lock-closed-outline" size={16} color={COLORS.textDisabled} />
            </View>
            <Text style={styles.hintText}>Email cannot be changed</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={deptModal} transparent animationType="slide" onRequestClose={() => setDeptModal(false)}>
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={() => setDeptModal(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Select Department</Text>
            <FlatList
              data={DEPARTMENTS}
              keyExtractor={item => item}
              renderItem={({ item }) => {
                const active = form.department === item;
                return (
                  <TouchableOpacity
                    style={[styles.sheetItem, active && styles.sheetItemActive]}
                    onPress={() => { set('department')(item); setDeptModal(false); }}
                  >
                    <Text style={[styles.sheetItemText, active && styles.sheetItemTextActive]}>{item}</Text>
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: SIZES.md, paddingVertical: SIZES.sm,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  backBtn: { padding: 4 },
  topTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginLeft: SIZES.sm },
  saveBtn: {
    backgroundColor: COLORS.primary, borderRadius: SIZES.borderRadiusFull,
    paddingHorizontal: SIZES.lg, paddingVertical: SIZES.sm, minWidth: 60, alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  btnDisabled: { opacity: 0.6 },
  scroll: { padding: SIZES.md, gap: SIZES.md },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.borderRadius,
    padding: SIZES.md, fontSize: 15, color: COLORS.textPrimary, backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  errorText: { fontSize: 12, color: COLORS.error },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.border, borderRadius: SIZES.borderRadius,
    padding: SIZES.md, backgroundColor: COLORS.surface,
  },
  selectBtnText: { fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  disabledField: { gap: 6 },
  disabledInput: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: COLORS.divider, borderRadius: SIZES.borderRadius,
    padding: SIZES.md, backgroundColor: COLORS.divider,
  },
  disabledText: { fontSize: 15, color: COLORS.textDisabled },
  hintText: { fontSize: 12, color: COLORS.textDisabled },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.surface, borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg, maxHeight: '70%', paddingBottom: SIZES.xl,
  },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2,
    alignSelf: 'center', marginTop: SIZES.sm, marginBottom: SIZES.md,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: SIZES.lg, marginBottom: SIZES.sm },
  sheetItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: SIZES.md, paddingHorizontal: SIZES.lg,
    borderBottomWidth: 1, borderBottomColor: COLORS.divider,
  },
  sheetItemActive: { backgroundColor: '#E8EAF6' },
  sheetItemText: { fontSize: 15, color: COLORS.textPrimary },
  sheetItemTextActive: { color: COLORS.primary, fontWeight: '600' },
});
