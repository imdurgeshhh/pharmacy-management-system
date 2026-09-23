import { describe, it, expect, beforeEach } from 'vitest';
import useStore from '../useStore';

describe('store/useStore.js', () => {
  beforeEach(() => {
    // Reset state before every test
    useStore.setState({
      user: null,
      token: null,
      cart: [],
    });
    localStorage.clear();
  });

  describe('Authentication and User Actions', () => {
    it('initializes with default guest and empty state', () => {
      const state = useStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.cart).toEqual([]);
      expect(state.getToken()).toBeNull();
      expect(state.getRole()).toBe('guest');
      expect(state.isAdmin()).toBe(false);
      expect(state.isEmployee()).toBe(false);
      expect(state.isAuthenticated()).toBe(false);
    });

    it('sets user and extracts user token properly', () => {
      const mockUser = {
        id: 1,
        name: 'Admin User',
        role: 'Admin',
        token: 'admin-jwt-token-xyz',
      };

      useStore.getState().setUser(mockUser);

      const state = useStore.getState();
      expect(state.user).toEqual(mockUser);
      expect(state.token).toBe('admin-jwt-token-xyz');
      expect(state.getToken()).toBe('admin-jwt-token-xyz');
      expect(state.getRole()).toBe('admin'); // normalized to lowercase
      expect(state.isAdmin()).toBe(true);
      expect(state.isEmployee()).toBe(false);
      expect(state.isAuthenticated()).toBe(true);
    });

    it('handles employee role correctly', () => {
      const employeeUser = {
        id: 2,
        name: 'Employee One',
        role: 'EMPLOYEE',
        token: 'emp-jwt-token-123',
      };

      useStore.getState().setUser(employeeUser);

      const state = useStore.getState();
      expect(state.getRole()).toBe('employee');
      expect(state.isAdmin()).toBe(false);
      expect(state.isEmployee()).toBe(true);
      expect(state.isAuthenticated()).toBe(true);
    });

    it('handles shopkeeper role without elevating to admin', () => {
      const shopkeeperUser = {
        id: 3,
        name: 'Shop Owner',
        role: 'shopkeeper',
        token: 'shop-jwt-token-456',
      };

      useStore.getState().setUser(shopkeeperUser);

      const state = useStore.getState();
      expect(state.getRole()).toBe('shopkeeper');
      expect(state.isAdmin()).toBe(false);
      expect(state.isEmployee()).toBe(false);
      expect(state.isAuthenticated()).toBe(true);
    });

    it('defaults to "guest" when user has undefined or empty role', () => {
      useStore.getState().setUser({ id: 4, name: 'No Role User', token: 'token' });
      expect(useStore.getState().getRole()).toBe('guest');
      expect(useStore.getState().isAdmin()).toBe(false);
    });

    it('setToken updates the token independently', () => {
      useStore.getState().setToken('standalone-token');
      expect(useStore.getState().getToken()).toBe('standalone-token');
      // Still not authenticated if user is null
      expect(useStore.getState().isAuthenticated()).toBe(false);
    });

    it('logout resets user and token to null', () => {
      useStore.getState().setUser({ id: 1, role: 'admin', token: 'jwt' });
      expect(useStore.getState().isAuthenticated()).toBe(true);

      useStore.getState().logout();

      const state = useStore.getState();
      expect(state.user).toBeNull();
      expect(state.token).toBeNull();
      expect(state.isAuthenticated()).toBe(false);
      expect(state.getRole()).toBe('guest');
    });
  });

  describe('Cart Actions', () => {
    const itemA = { inventory_id: 101, name: 'Paracetamol 500mg', mrp: 25.0 };
    const itemB = { inventory_id: 102, name: 'Amoxicillin 250mg', mrp: 40.0 };

    it('adds a new item to cart with qty 1', () => {
      useStore.getState().addToCart(itemA);

      const cart = useStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0]).toEqual({ ...itemA, qty: 1 });
    });

    it('increments quantity when existing item is added again', () => {
      useStore.getState().addToCart(itemA);
      useStore.getState().addToCart(itemA);
      useStore.getState().addToCart(itemB);

      const cart = useStore.getState().cart;
      expect(cart).toHaveLength(2);
      expect(cart.find(i => i.inventory_id === 101).qty).toBe(2);
      expect(cart.find(i => i.inventory_id === 102).qty).toBe(1);
    });

    it('updates quantity of an existing cart item', () => {
      useStore.getState().addToCart(itemA);
      useStore.getState().updateCartQty(101, 5);

      const cart = useStore.getState().cart;
      expect(cart[0].qty).toBe(5);
    });

    it('removes an item from cart by inventory_id', () => {
      useStore.getState().addToCart(itemA);
      useStore.getState().addToCart(itemB);

      useStore.getState().removeFromCart(101);

      const cart = useStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0].inventory_id).toBe(102);
    });

    it('removing a non-existent item leaves the cart untouched', () => {
      useStore.getState().addToCart(itemA);

      useStore.getState().removeFromCart(999); // ID does not exist

      const cart = useStore.getState().cart;
      expect(cart).toHaveLength(1);
      expect(cart[0].inventory_id).toBe(101);
    });

    it('clears all items from cart with clearCart', () => {
      useStore.getState().addToCart(itemA);
      useStore.getState().addToCart(itemB);
      expect(useStore.getState().cart).toHaveLength(2);

      useStore.getState().clearCart();

      expect(useStore.getState().cart).toEqual([]);
    });
  });

  describe('Purchase Draft Actions (Bug 2 Fix)', () => {
    it('initializes with a blank purchase draft', () => {
      const state = useStore.getState();
      expect(state.purchaseDraft).toBeDefined();
      expect(state.purchaseDraft.supplierId).toBeNull();
      expect(state.purchaseDraft.invoiceNo).toBe('');
      expect(state.purchaseDraft.entries).toEqual([]);
      expect(state.purchaseDraft.form.medicine_name).toBe('');
    });

    it('updates draft form and supplier details and preserves them', () => {
      useStore.getState().setPurchaseDraft({
        supplierId: 42,
        suppGst: '29ABCDE1234F1Z5',
        invoiceNo: 'INV-TEST-99',
        entries: [{ medicine_name: 'Dolo 650', qty: 50, price: 30 }],
      });

      const state = useStore.getState();
      expect(state.purchaseDraft.supplierId).toBe(42);
      expect(state.purchaseDraft.suppGst).toBe('29ABCDE1234F1Z5');
      expect(state.purchaseDraft.invoiceNo).toBe('INV-TEST-99');
      expect(state.purchaseDraft.entries).toHaveLength(1);
      expect(state.purchaseDraft.entries[0].medicine_name).toBe('Dolo 650');
    });

    it('clears purchase draft on clearPurchaseDraft()', () => {
      useStore.getState().setPurchaseDraft({
        supplierId: 42,
        invoiceNo: 'INV-TEST-99',
      });
      useStore.getState().clearPurchaseDraft();

      const state = useStore.getState();
      expect(state.purchaseDraft.supplierId).toBeNull();
      expect(state.purchaseDraft.invoiceNo).toBe('');
      expect(state.purchaseDraft.entries).toEqual([]);
    });

    it('increments inventoryVersion and reportsVersion on invalidatePurchasesAndStock()', () => {
      const beforeInv = useStore.getState().inventoryVersion;
      const beforeRep = useStore.getState().reportsVersion;

      useStore.getState().invalidatePurchasesAndStock();

      expect(useStore.getState().inventoryVersion).toBe(beforeInv + 1);
      expect(useStore.getState().reportsVersion).toBe(beforeRep + 1);
    });

    it('does not persist purchase draft to localStorage (memory-only)', () => {
      useStore.getState().setPurchaseDraft({
        supplierId: 99,
        invoiceNo: 'DRAFT-IN-MEMORY-ONLY',
      });

      const raw = localStorage.getItem('pharma-storage');
      if (raw) {
        const parsed = JSON.parse(raw);
        expect(parsed.state?.purchaseDraft).toBeUndefined();
      }
    });
  });
});
