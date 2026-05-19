import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { COLORS, SIZES, SHADOWS } from '../../constants/theme';
import { DEPARTMENTS } from '../../constants';
import Toast from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const { toast, showToast, hideToast } = useToast();
  const [form, setForm] = useState({
    name: '', email: '', phone: '', department: DEPARTMENTS[0],
    studentIdNumber: '', password: '', confirmPassword: '',
  });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [deptModalVisible, setDeptModalVisible] = useState(false);

  const set = (k) => (v) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(p => ({ ...p, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email.trim()) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Enter a valid email';
    if (!form.phone.trim()) e.phone = 'Phone number is required';
    else if (!/^(\+?234|0)\d{10}$/.test(form.phone.replace(/\s/g, ''))) e.phone = 'Enter a valid Nigerian phone number';
    if (!form.studentIdNumber.trim()) e.studentIdNumber = 'Student ID number is required';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register(form.email.trim().toLowerCase(), form.password, {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        department: form.department,
        studentIdNumber: form.studentIdNumber.trim(),
      });
      showToast('Account created! Please upload your student ID to get verified.', 'success');
      setTimeout(() => navigation.replace('UploadId'), 1500);
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered'
        : 'Registration failed. Please try again.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, field, ...props }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, errors[field] && styles.inputError]}
        placeholderTextColor={COLORS.textDisabled}
        value={form[field]}
        onChangeText={set(field)}
        {...props}
      />
      {errors[field] ? <Text style={styles.errorText}>{errors[field]}</Text> : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.topTitle}>Create Account</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.subtitle}>Join the UNIBEN campus marketplace</Text>

            <Field label="Full Name" field="name" placeholder="e.g. Chidi Okeke" autoCapitalize="words" />
            <Field label="Email Address" field="email" placeholder="yourname@gmail.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} />
            <Field label="Phone Number" field="phone" placeholder="08012345678" keyboardType="phone-pad" />
            <Field label="Student ID Number" field="studentIdNumber" placeholder="e.g. 200401001" autoCapitalize="characters" />

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Department</Text>
              <TouchableOpacity
                style={[styles.selectBtn, errors.department && styles.inputError]}
                onPress={() => setDeptModalVisible(true)}
              >
                <Text style={styles.selectBtnText}>{form.department}</Text>
                <Ionicons name="chevron-down" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.passwordRow, errors.password && styles.inputError]}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={COLORS.textDisabled}
                  value={form.password}
                  onChangeText={set('password')}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off' : 'eye'} size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Confirm Password</Text>
              <TextInput
                style={[styles.input, errors.confirmPassword && styles.inputError]}
                placeholder="Re-enter password"
                placeholderTextColor={COLORS.textDisabled}
                value={form.confirmPassword}
                onChangeText={set('confirmPassword')}
                secureTextEntry={!showPass}
                autoCapitalize="none"
              />
              {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
            </View>

            <TouchableOpacity
              style={[styles.primaryBtn, loading && styles.btnDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#FFF" />
                : <Text style={styles.primaryBtnText}>Create Account</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.goBack()}>
              <Text style={styles.secondaryBtnText}>
                Already have an account? <Text style={styles.link}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={deptModalVisible} animationType="slide" transparent onRequestClose={() => setDeptModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setDeptModalVisible(false)}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Select Department</Text>
            <FlatList
              data={DEPARTMENTS}
              keyExtractor={item => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.modalItem, form.department === item && styles.modalItemSelected]}
                  onPress={() => { set('department')(item); setDeptModalVisible(false); }}
                >
                  <Text style={[styles.modalItemText, form.department === item && styles.modalItemTextSelected]}>
                    {item}
                  </Text>
                  {form.department === item && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={hideToast} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.primary },
  scroll: { flexGrow: 1, paddingBottom: SIZES.xl },
  topBar: { flexDirection: 'row', alignItems: 'center', padding: SIZES.md, gap: SIZES.md },
  backBtn: { padding: 4 },
  topTitle: { fontSize: 20, fontWeight: '700', color: '#FFF' },
  card: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg,
    padding: SIZES.lg,
    flex: 1,
    minHeight: 600,
  },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginBottom: SIZES.lg },
  fieldGroup: { marginBottom: SIZES.md },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    fontSize: 15,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
  },
  inputError: { borderColor: COLORS.error },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    padding: SIZES.md,
    backgroundColor: COLORS.background,
  },
  selectBtnText: { fontSize: 15, color: COLORS.textPrimary, flex: 1 },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: SIZES.borderRadius,
    backgroundColor: COLORS.background,
  },
  passwordInput: { flex: 1, padding: SIZES.md, fontSize: 15, color: COLORS.textPrimary },
  eyeBtn: { padding: SIZES.md },
  errorText: { fontSize: 12, color: COLORS.error, marginTop: 4 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: SIZES.borderRadiusFull,
    padding: SIZES.md,
    alignItems: 'center',
    marginTop: SIZES.sm,
    ...SHADOWS.small,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { alignItems: 'center', marginTop: SIZES.md, padding: SIZES.sm },
  secondaryBtnText: { fontSize: 14, color: COLORS.textSecondary },
  link: { color: COLORS.primary, fontWeight: '600' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: SIZES.borderRadiusLg,
    borderTopRightRadius: SIZES.borderRadiusLg,
    maxHeight: '70%',
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
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, paddingHorizontal: SIZES.lg, marginBottom: SIZES.sm },
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
  modalItemText: { fontSize: 15, color: COLORS.textPrimary },
  modalItemTextSelected: { color: COLORS.primary, fontWeight: '600' },
});
