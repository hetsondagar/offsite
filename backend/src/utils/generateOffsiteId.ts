import { Counter } from '../modules/users/counter.model';
import { UserRole } from '../types';

/**
 * Generates a unique, role-based OffSite ID.
 * 
 * Format: OS<ROLE><4-digit-sequence>
 * Examples: OSSE0001, OSPM0042, OSOW0001
 * 
 * This function is concurrency-safe using MongoDB's atomic findOneAndUpdate.
 * IDs are generated exactly once at signup and never change.
 * 
 * @param role - User role (engineer, manager, or owner)
 * @returns Promise<string> - Unique OffSite ID (e.g., "OSSE0023")
 */
export async function generateOffsiteId(role: UserRole): Promise<string> {
  const roleMap: Record<UserRole, 'SE' | 'PM' | 'OW' | 'PR' | 'CT'> = {
    engineer: 'SE',
    manager: 'PM',
    owner: 'OW',
    purchase_manager: 'PR',
    contractor: 'CT',
  };

  const roleCode = roleMap[role];
  const prefix = `OS${roleCode}`;

  // Atomic increment using findOneAndUpdate
  // This ensures no collisions even with concurrent signups
  const counter = await Counter.findOneAndUpdate(
    { role: roleCode },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );

  // Pad sequence number to 4 digits (e.g., 1 -> "0001", 42 -> "0042")
  const paddedSeq = String(counter.seq).padStart(4, '0');
  
  return `${prefix}${paddedSeq}`;
}

