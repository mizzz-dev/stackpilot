import { useState } from 'react';
import { router, Stack } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useInspector } from '@/providers/inspector-provider';
import { colors } from '@/theme/colors';

export default function PairingScreen() {
  const { pair } = useInspector();
  const [permission, requestPermission] = useCameraPermissions();
  const [manualValue, setManualValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  const connect = async (value: string) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setErrorMessage(undefined);

    try {
      await pair(value.trim());
      router.replace('/');
    } catch (error) {
      setHasScanned(false);
      setErrorMessage(error instanceof Error ? error.message : 'ペアリングに失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBarcodeScanned = (result: BarcodeScanningResult) => {
    if (hasScanned || !result.data.startsWith('stackpilot://pair')) return;
    setHasScanned(true);
    void connect(result.data);
  };

  const canUseCamera = Platform.OS !== 'web' && permission?.granted;

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ padding: 16, gap: 16, backgroundColor: colors.background, flexGrow: 1 }}
    >
      <Stack.Screen options={{ title: 'Desktopと接続' }} />

      <View style={{ gap: 6 }}>
        <Text selectable style={{ color: colors.text, fontSize: 18, fontWeight: '700' }}>
          ペアリングQRを読み取る
        </Text>
        <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
          Desktopの「Mobile接続」から接続を開始し、表示されたQRコードを読み取ってください。両方の端末を同じLANへ接続してください。
        </Text>
      </View>

      {canUseCamera ? (
        <View style={{ height: 340, overflow: 'hidden', borderRadius: 18, borderWidth: 1, borderColor: colors.border }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={hasScanned ? undefined : handleBarcodeScanned}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              alignSelf: 'center',
              top: 55,
              width: 230,
              height: 230,
              borderWidth: 2,
              borderColor: colors.accent,
              borderRadius: 20
            }}
          />
        </View>
      ) : Platform.OS === 'web' ? (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, backgroundColor: colors.surface }}>
          <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
            Web版ではカメラ読み取りを利用できません。下の入力欄へペアリング文字列を貼り付けてください。
          </Text>
        </View>
      ) : (
        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 14, gap: 12, backgroundColor: colors.surface }}>
          <Text selectable style={{ color: colors.muted, fontSize: 13, lineHeight: 20 }}>
            QRコードを読み取るため、カメラへのアクセスを許可してください。
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void requestPermission()}
            style={({ pressed }) => ({
              opacity: pressed ? 0.75 : 1,
              alignSelf: 'flex-start',
              borderRadius: 10,
              paddingHorizontal: 14,
              paddingVertical: 10,
              backgroundColor: colors.accent
            })}
          >
            <Text style={{ color: '#ffffff', fontWeight: '700' }}>カメラを許可</Text>
          </Pressable>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Text style={{ color: colors.text, fontSize: 13, fontWeight: '700' }}>手動入力</Text>
        <TextInput
          value={manualValue}
          onChangeText={setManualValue}
          autoCapitalize="none"
          autoCorrect={false}
          multiline
          placeholder="stackpilot://pair?..."
          placeholderTextColor={colors.muted}
          style={{
            minHeight: 88,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 12,
            backgroundColor: colors.surface,
            color: colors.text,
            padding: 12,
            fontSize: 12
          }}
        />
        <Pressable
          accessibilityRole="button"
          disabled={!manualValue.trim() || isSubmitting}
          onPress={() => void connect(manualValue)}
          style={({ pressed }) => ({
            opacity: !manualValue.trim() || isSubmitting ? 0.45 : pressed ? 0.75 : 1,
            alignItems: 'center',
            borderRadius: 12,
            paddingVertical: 12,
            backgroundColor: colors.accent
          })}
        >
          <Text style={{ color: '#ffffff', fontWeight: '700' }}>{isSubmitting ? '接続中…' : '接続する'}</Text>
        </Pressable>
      </View>

      {errorMessage ? (
        <View style={{ borderWidth: 1, borderColor: `${colors.danger}80`, borderRadius: 12, backgroundColor: `${colors.danger}18`, padding: 12 }}>
          <Text selectable style={{ color: colors.danger, fontSize: 13, lineHeight: 20 }}>{errorMessage}</Text>
        </View>
      ) : null}

      <Text selectable style={{ color: colors.muted, fontSize: 12, lineHeight: 18 }}>
        QRコードには短時間だけ有効な接続情報が含まれます。QR画像や文字列を第三者へ共有しないでください。
      </Text>
    </ScrollView>
  );
}
