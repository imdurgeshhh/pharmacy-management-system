import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * useStore — Global app state managed by Zustand
 *
 * Auth model:
 * - Clerk handles authentication (sign in/out, session tokens)
 * - After Clerk sign-in, ClerkAuthSync (App.jsx) calls /api/auth/clerk-sync
 *   to provision/look up the user in the local employees table and return
 *   the DB role (admin / shopkeeper / employee).
 * - `user` here holds that DB profile (id, name, email, role).
 * - There is NO token stored here; session tokens are managed by Clerk.
 */
const useStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            cart: [],

            // Set the DB user profile (populated by ClerkAuthSync)
            setUser: (user) => set((state) => ({
                user,
                token: user?.token !== undefined ? user.token : state.token
            })),

            // Clear user on sign-out (called from App.jsx after Clerk sign-out)
            logout: () => set({ user: null, token: null, cart: [] }),

            // Token & Role helpers — role comes from the local DB, not Clerk metadata
            getToken: () => get().token,
            setToken: (token) => set({ token }),
            getRole: () => get().user?.role?.toLowerCase() || 'guest',
            isAdmin: () => get().getRole() === 'admin',
            isEmployee: () => get().getRole() === 'employee',
            isAuthenticated: () => !!get().user && get().token !== null,

            // Cart actions
            addToCart: (item) => set((state) => {
                const existing = state.cart.find(i => i.inventory_id === item.inventory_id);
                if (existing) {
                    return { cart: state.cart.map(i => i.inventory_id === item.inventory_id ? { ...i, qty: i.qty + 1 } : i) };
                }
                return { cart: [...state.cart, { ...item, qty: 1 }] };
            }),
            removeFromCart: (inventory_id) => set((state) => ({
                cart: state.cart.filter(i => i.inventory_id !== inventory_id)
            })),
            updateCartQty: (inventory_id, qty) => set((state) => ({
                cart: state.cart.map(i => i.inventory_id === inventory_id ? { ...i, qty } : i)
            })),
            clearCart: () => set({ cart: [] }),
        }),
        {
            name: 'pharma-storage',
            partialize: (state) => ({ user: state.user }), // only persist user profile
        }
    )
);

export default useStore;
