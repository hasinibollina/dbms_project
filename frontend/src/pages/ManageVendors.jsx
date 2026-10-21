import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  IndianRupee,
  Star,
  RefreshCw,
  Power,
  PowerOff,
} from 'lucide-react';
import { vendorsApi } from '../api';
import {
  SEED_VENDORS,
  formatINR,
  getStoredVendors,
  saveStoredVendors,
} from '../data/seedData';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

const SERVICE_TYPES = [
  'Catering',
  'Sound & AV',
  'Stage & Decor',
  'Photography & Video',
  'Security & Hospitality',
];

const CITIES = ['All', 'Bengaluru', 'Mumbai', 'Hyderabad'];

export default function ManageVendors() {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [selectedService, setSelectedService] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');

  // Modal for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null); // null = Add, object = Edit
  const [formData, setFormData] = useState({
    name: '',
    service_type: 'Catering',
    city: 'Bengaluru',
    phone: '',
    price_min: '30000',
    price_max: '90000',
    rating: '4.8',
    status: 'Active',
    description: '',
  });
  const [formErrors, setFormErrors] = useState({});

  // Deletion / Deactivation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const data = await vendorsApi.getAll();
      if (Array.isArray(data) && data.length > 0) {
        setVendors(data);
        setIsUsingFallback(false);
      } else {
        throw new Error('Empty vendors data');
      }
    } catch {
      setIsUsingFallback(true);
      const stored = getStoredVendors();
      setVendors(stored);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  // Filtered list
  const filteredVendors = useMemo(() => {
    return vendors.filter((vnd) => {
      if (selectedCity !== 'All' && vnd.city?.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      if (selectedService !== 'All' && vnd.service_type?.toLowerCase() !== selectedService.toLowerCase()) {
        return false;
      }
      if (selectedStatus !== 'All' && vnd.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = vnd.name?.toLowerCase().includes(q);
        const matchPhone = vnd.phone?.toLowerCase().includes(q);
        const matchDesc = vnd.description?.toLowerCase().includes(q);
        if (!matchName && !matchPhone && !matchDesc) return false;
      }
      return true;
    });
  }, [vendors, selectedCity, selectedService, selectedStatus, searchQuery]);

  // Open modal for Add
  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({
      name: '',
      service_type: 'Catering',
      city: 'Bengaluru',
      phone: '+91 98',
      price_min: '35000',
      price_max: '100000',
      rating: '4.8',
      status: 'Active',
      description: '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (vnd) => {
    setEditingVendor(vnd);
    setFormData({
      name: vnd.name || '',
      service_type: vnd.service_type || 'Catering',
      city: vnd.city || 'Bengaluru',
      phone: vnd.phone || '',
      price_min: String(vnd.price_min || 0),
      price_max: String(vnd.price_max || 0),
      rating: String(vnd.rating || 4.5),
      status: vnd.status || 'Active',
      description: vnd.description || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vendor name is required';
    if (!formData.city.trim()) errs.city = 'City is required';
    if (!formData.phone.trim()) errs.phone = 'Phone number is required';
    if (Number(formData.price_min) < 0) errs.price_min = 'Min price cannot be negative';
    if (Number(formData.price_max) < Number(formData.price_min)) {
      errs.price_max = 'Max price must be greater than or equal to Min price';
    }
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      name: formData.name.trim(),
      service_type: formData.service_type,
      city: formData.city.trim(),
      phone: formData.phone.trim(),
      price_min: Number(formData.price_min),
      price_max: Number(formData.price_max),
      rating: Number(formData.rating),
      status: formData.status,
      description: formData.description.trim(),
    };

    if (editingVendor) {
      // Edit
      try {
        await vendorsApi.update(editingVendor.vendor_id, payload);
      } catch (err) {
        console.warn('Backend update failed, persisting locally:', err.message);
      }
      const updated = vendors.map((v) =>
        v.vendor_id === editingVendor.vendor_id ? { ...v, ...payload } : v
      );
      setVendors(updated);
      saveStoredVendors(updated);
      toast.success(`Vendor "${payload.name}" updated successfully!`);
    } else {
      // Add
      let newId = Math.max(...vendors.map((v) => v.vendor_id), 0) + 1;
      try {
        const resp = await vendorsApi.create(payload);
        if (resp?.vendor_id) newId = resp.vendor_id;
      } catch (err) {
        console.warn('Backend create failed, persisting locally:', err.message);
      }
      const newVnd = { ...payload, vendor_id: newId, events_served: 0 };
      const updated = [newVnd, ...vendors];
      setVendors(updated);
      saveStoredVendors(updated);
      toast.success(`Vendor "${newVnd.name}" added successfully!`);
    }

    setModalOpen(false);
  };

  // Toggle Activate / Deactivate
  const handleToggleStatus = async (vnd) => {
    const nextStatus = vnd.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await vendorsApi.update(vnd.vendor_id, { status: nextStatus });
    } catch (err) {
      console.warn('Backend toggle failed, saving locally:', err.message);
    }
    const updated = vendors.map((v) =>
      v.vendor_id === vnd.vendor_id ? { ...v, status: nextStatus } : v
    );
    setVendors(updated);
    saveStoredVendors(updated);
    toast.info(`Vendor "${vnd.name}" is now ${nextStatus}.`);
  };

  // Delete vendor
  const confirmDeleteVendor = async () => {
    if (!vendorToDelete) return;
    try {
      await vendorsApi.delete(vendorToDelete.vendor_id);
    } catch (err) {
      console.warn('Backend delete failed, removing locally:', err.message);
    }
    const updated = vendors.filter((v) => v.vendor_id !== vendorToDelete.vendor_id);
    setVendors(updated);
    saveStoredVendors(updated);
    toast.info(`Vendor "${vendorToDelete.name}" deleted.`);
    setDeleteModalOpen(false);
    setVendorToDelete(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14 w-full animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 pb-6 border-b border-sand-dark">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sand-dark/60 text-wine text-xs font-heading uppercase tracking-wider mb-2">
            <Store className="w-3.5 h-3.5" />
            <span>DBMS Vendor Registry</span>
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl uppercase tracking-tighter text-ink">
            MANAGE VENDORS
          </h1>
          <p className="text-ink/70 text-sm sm:text-base mt-1 max-w-2xl">
            Curate vetted vendor partnerships across catering, sound & lighting, decor, and photography.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="add-vendor-button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add Vendor</span>
          </button>

          <button
            type="button"
            onClick={loadVendors}
            className="p-3 rounded-xl border border-sand-dark bg-sand text-ink hover:bg-sand-dark/40 transition-colors"
            title="Refresh vendors list"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-wine' : ''}`} />
          </button>
        </div>
      </div>

      {/* Fallback Banner */}
      {isUsingFallback && (
        <div className="mb-6 p-4 rounded-xl bg-sand border border-sand-dark flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-wine flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-wine font-semibold block mb-0.5">
              Demonstration Mode (DBMS Seed Data)
            </strong>
            Backend connection ({import.meta.env.VITE_API_URL || 'http://localhost:8000'}) is currently offline. Operating on local normalized vendor records with CRUD persistence.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-4 mb-6 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-wine absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor name, phone..."
              className="w-full pl-10 pr-4 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
            />
          </div>

          {/* City Filter */}
          <div>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="All">All Cities</option>
              <option value="Bengaluru">Bengaluru</option>
              <option value="Mumbai">Mumbai</option>
              <option value="Hyderabad">Hyderabad</option>
            </select>
          </div>

          {/* Service Type Filter */}
          <div>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="All">All Service Types</option>
              {SERVICE_TYPES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-sand rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-sand-dark/60 text-wine border-b border-sand-dark font-heading uppercase tracking-wider text-[11px]">
                <th className="p-4">Vendor Name & Details</th>
                <th className="p-4">Service Type</th>
                <th className="p-4">City & Contact</th>
                <th className="p-4">Price Range</th>
                <th className="p-4 text-center">Rating</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-dark/60 font-medium">
              {filteredVendors.length > 0 ? (
                filteredVendors.map((vnd) => (
                  <tr key={vnd.vendor_id} className="hover:bg-sand-dark/25 transition-colors">
                    {/* Name */}
                    <td className="p-4">
                      <span className="font-heading text-ink text-sm block">
                        {vnd.name}
                      </span>
                      {vnd.description && (
                        <p className="text-[11px] text-ink/70 line-clamp-1 mt-0.5 max-w-xs">
                          {vnd.description}
                        </p>
                      )}
                    </td>

                    {/* Service Type */}
                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider bg-sand-dark text-wine">
                        {vnd.service_type}
                      </span>
                    </td>

                    {/* City & Phone */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="font-semibold text-ink">{vnd.city}</div>
                      <div className="text-[10px] text-ink/60">{vnd.phone}</div>
                    </td>

                    {/* Price Range */}
                    <td className="p-4 font-semibold text-ink whitespace-nowrap">
                      {formatINR(vnd.price_min)} - {formatINR(vnd.price_max)}
                    </td>

                    {/* Rating */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 font-bold text-xs border border-amber-300">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        {vnd.rating}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider font-bold ${
                          vnd.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-red-100 text-red-800 border border-red-300'
                        }`}
                      >
                        {vnd.status}
                      </span>
                    </td>

                    {/* Actions: Edit, Deactivate/Activate, Delete */}
                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(vnd)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sand-dark bg-sand text-ink hover:bg-wine hover:text-sand hover:border-wine text-xs font-semibold transition-all shadow-sm"
                          title="Edit Vendor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleStatus(vnd)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-semibold transition-all shadow-sm ${
                            vnd.status === 'Active'
                              ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white'
                              : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-700 hover:text-white'
                          }`}
                          title={vnd.status === 'Active' ? 'Deactivate Vendor' : 'Activate Vendor'}
                        >
                          {vnd.status === 'Active' ? (
                            <>
                              <PowerOff className="w-3.5 h-3.5" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <Power className="w-3.5 h-3.5" />
                              <span>Activate</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setVendorToDelete(vnd);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-700 hover:text-white transition-colors"
                          title="Delete Vendor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="p-10 text-center text-ink/60">
                    No vendors found matching your filter selections.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          ADD / EDIT VENDOR MODAL
          ========================================================================= */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-fadeIn"
        >
          <div className="bg-sand text-ink rounded-2xl max-w-lg w-full border border-sand-dark shadow-poster p-6 relative max-h-[90vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 text-ink/50 hover:text-ink p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-wine"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-wine/10 text-wine flex items-center justify-center">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-heading text-xl uppercase tracking-tight text-ink">
                  {editingVendor ? 'Edit Vendor Details' : 'Register New Vendor'}
                </h3>
                <p className="text-xs text-ink/70">
                  {editingVendor ? `Updating #${editingVendor.vendor_id}` : 'Provide contact and pricing details'}
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              {/* Vendor Name */}
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Vendor Business Name <span className="text-red-700">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Royal Rasoi Caterers"
                  className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
                {formErrors.name && <p className="text-xs text-red-700">{formErrors.name}</p>}
              </div>

              {/* Service Type & City */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Service Type
                  </label>
                  <select
                    value={formData.service_type}
                    onChange={(e) => setFormData({ ...formData, service_type: e.target.value })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    {SERVICE_TYPES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    City <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="e.g. Bengaluru"
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.city && <p className="text-xs text-red-700">{formErrors.city}</p>}
                </div>
              </div>

              {/* Phone & Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Contact Phone <span className="text-red-700">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 9845012345"
                    className="w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.phone && <p className="text-xs text-red-700">{formErrors.phone}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              {/* Price Range & Rating */}
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Price Min (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_min}
                    onChange={(e) => setFormData({ ...formData, price_min: e.target.value })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.price_min && (
                    <p className="text-xs text-red-700">{formErrors.price_min}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Price Max (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.price_max}
                    onChange={(e) => setFormData({ ...formData, price_max: e.target.value })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                  {formErrors.price_max && (
                    <p className="text-xs text-red-700">{formErrors.price_max}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                    Rating (1-5)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    value={formData.rating}
                    onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                    className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink focus:outline-none focus:ring-2 focus:ring-wine"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-heading uppercase tracking-wider text-ink">
                  Service Description
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detail menu offerings, equipment specifications, staging trussing..."
                  className="w-full px-3.5 py-2 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-sand-dark">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-sand-dark text-xs font-heading uppercase tracking-wider font-bold text-ink hover:bg-sand-dark/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-sm"
                >
                  {editingVendor ? 'Save Changes' : 'Register Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Vendor Partnership?"
        message={`Are you sure you want to permanently delete "${vendorToDelete?.name}"? Past assignments will lose this vendor link.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={confirmDeleteVendor}
        onClose={() => {
          setDeleteModalOpen(false);
          setVendorToDelete(null);
        }}
      />
    </div>
  );
}
