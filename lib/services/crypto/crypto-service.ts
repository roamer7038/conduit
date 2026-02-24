/**
 * CryptoService
 *
 * APIキーやその他の機密情報を暗号化・復号化するサービス
 * AES-GCM 256bitアルゴリズムを使用
 */
export class CryptoService {
  private static encryptionKey: CryptoKey | null = null;
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 12 bytes for AES-GCM
  private static readonly SALT = 'browser-agent-extension-crypto-v1';
  private static readonly PREFIX = 'AES256:';

  /**
   * 暗号化サービスを初期化
   * 拡張機能のIDから決定論的にキーを派生
   */
  static async initialize(): Promise<void> {
    if (this.encryptionKey) {
      return; // 既に初期化済み
    }

    try {
      const extensionId = chrome.runtime.id;

      // 拡張機能IDとソルトからキーマテリアルを作成
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(extensionId + this.SALT),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      // PBKDF2でAES-GCMキーを派生
      this.encryptionKey = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: new TextEncoder().encode(this.SALT),
          iterations: 100000,
          hash: 'SHA-256'
        },
        keyMaterial,
        { name: this.ALGORITHM, length: this.KEY_LENGTH },
        false, // extractable: false (抽出不可)
        ['encrypt', 'decrypt']
      );
    } catch (error) {
      console.error('[CryptoService] Failed to initialize:', error);
      throw new Error('Failed to initialize encryption service');
    }
  }

  /**
   * 平文を暗号化
   * @param plaintext 暗号化する文字列
   * @returns "AES256:" プレフィックス付きの暗号化データ（base64）
   */
  static async encrypt(plaintext: string): Promise<string> {
    try {
      if (!this.encryptionKey) {
        throw new Error('Encryption service not initialized');
      }

      // ランダムなIVを生成
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));

      // 平文をエンコード
      const encodedText = new TextEncoder().encode(plaintext);

      // 暗号化
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        this.encryptionKey,
        encodedText
      );

      // IV + 暗号化データを結合
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // Base64エンコード
      const base64 = btoa(String.fromCharCode(...combined));

      return `${this.PREFIX}${base64}`;
    } catch (error) {
      console.error('[CryptoService] Encryption failed:', error);
      // フォールバック: 平文を返す
      return plaintext;
    }
  }

  /**
   * 暗号文を復号化
   * @param ciphertext 暗号化された文字列
   * @returns 復号化された平文
   */
  static async decrypt(ciphertext: string): Promise<string> {
    try {
      // プレフィックスチェック（後方互換性）
      if (!ciphertext.startsWith(this.PREFIX)) {
        // 平文データをそのまま返す
        return ciphertext;
      }

      if (!this.encryptionKey) {
        throw new Error('Encryption service not initialized');
      }

      // プレフィックスを除去
      const base64Data = ciphertext.substring(this.PREFIX.length);

      // Base64デコード
      const combined = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // IVと暗号化データを分離
      const iv = combined.slice(0, this.IV_LENGTH);
      const encryptedData = combined.slice(this.IV_LENGTH);

      // 復号化
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        this.encryptionKey,
        encryptedData
      );

      // デコード
      const plaintext = new TextDecoder().decode(decryptedData);

      return plaintext;
    } catch (error) {
      console.error('[CryptoService] Decryption failed:', error);
      // 復号化失敗時は空文字列を返す
      return '';
    }
  }
}
