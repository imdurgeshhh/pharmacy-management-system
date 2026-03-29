import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useStore = create(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            cart: [],
            setUser: (user) => set({ user, token: user?.token || null }),
            setToken: (token) => set({ token }),
            logout: () => set({ user: null, token: null }),
            getToken: () => get().token,
            getRole: () => get().user?.role?.toLowerCase() || 'guest',
            isAdmin: () => get().getRole() === 'admin',
            isEmployee: () => get().getRole() === 'employee',
            isAuthenticated: () => !!get().token && !!get().user,
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
            partialize: (state) => ({ user: state.user }), // only persist auth state
        }
    )
);


export default useStore;
