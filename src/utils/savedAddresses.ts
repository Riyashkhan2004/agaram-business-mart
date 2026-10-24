export type SavedAddress = {
  id: string
  name: string
  phone: string
  address: string
  city: string
  pincode: string
  isDefault: boolean
}

type SavedAddressRecord = { expiresAt: number; addresses: SavedAddress[] }

export const SAVED_ADDRESS_TTL_MS = 60 * 60 * 1000

const storageKey = (userId: string) => `abm_saved_addresses_${encodeURIComponent(userId)}`

export function loadSavedAddresses(userId?: string | null): SavedAddressRecord {
  if (!userId) return { expiresAt: 0, addresses: [] }
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return { expiresAt: 0, addresses: [] }
    const record = JSON.parse(raw) as SavedAddressRecord
    if (!record.expiresAt || record.expiresAt <= Date.now() || !Array.isArray(record.addresses)) {
      localStorage.removeItem(storageKey(userId))
      return { expiresAt: 0, addresses: [] }
    }
    return record
  } catch {
    localStorage.removeItem(storageKey(userId))
    return { expiresAt: 0, addresses: [] }
  }
}

export function saveUserAddresses(userId: string | undefined, addresses: SavedAddress[]) {
  if (!userId) return 0
  const expiresAt = Date.now() + SAVED_ADDRESS_TTL_MS
  const record: SavedAddressRecord = { expiresAt, addresses }
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(record))
    return expiresAt
  } catch {
    return 0
  }
}
