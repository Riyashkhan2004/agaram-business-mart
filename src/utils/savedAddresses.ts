export type SavedAddress = {
  id: string
  name: string
  phone: string
  address: string
  city: string
  pincode: string
  isDefault: boolean
}

type SavedAddressRecord = { expiresAt?: number | null; addresses: SavedAddress[] }

const storageKey = (userId: string) => `abm_saved_addresses_${encodeURIComponent(userId)}`

export function loadSavedAddresses(userId?: string | null): SavedAddressRecord {
  if (!userId) return { expiresAt: 0, addresses: [] }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { expiresAt: 0, addresses: [] }
    const record = JSON.parse(raw) as SavedAddressRecord
    if (!Array.isArray(record.addresses)) {
      localStorage.removeItem(storageKey(userId))
      return { expiresAt: 0, addresses: [] }
    }
    // Upgrade previously time-limited browser records to permanent addresses.
    return { expiresAt: 0, addresses: record.addresses }
  } catch {
    localStorage.removeItem(storageKey(userId))
    return { expiresAt: 0, addresses: [] }
  }
}

export function saveUserAddresses(userId: string | undefined, addresses: SavedAddress[]) {
  if (!userId) return 0
  const record: SavedAddressRecord = { expiresAt: null, addresses }
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(record))
    return 0
  } catch {
    return 0
  }
}
