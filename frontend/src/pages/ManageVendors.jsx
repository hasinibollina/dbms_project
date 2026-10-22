import React, { useState, useEffect, useMemo } from 'react';
import {
  Store,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  X,
  Phone,
  Mail,
  RefreshCw,
} from 'lucide-react';
import { vendorsApi, servicesApi } from '../api';
import ConfirmModal from '../components/ConfirmModal';
import { useToast } from '../context/ToastContext';

// Columns in the `vendors` table:
//   vendor_id, vendor_name, service_id (-> services), service_description, phone, email, created_at
const EMPTY_FORM = {
  vendor_name: '',
  service_id: '',
  service_description: '',
  phone: '',
  email: '',
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function ManageVendors() {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('All');

  // Add / Edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState(null); // null = Add, object = Edit
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadVendors = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [vendorRows, serviceRows] = await Promise.all([
        vendorsApi.getAll(),
        servicesApi.getAll(),
      ]);
      setVendors(Array.isArray(vendorRows) ? vendorRows : []);
      setServices(Array.isArray(serviceRows) ? serviceRows : []);
    } catch (err) {
      setVendors([]);
      setLoadError(err.message || 'Could not load vendors.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, []);

  const filteredVendors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return vendors.filter((vnd) => {
      if (selectedService !== 'All' && String(vnd.service_id) !== selectedService) return false;
      if (q) {
        const haystack = [vnd.vendor_name, vnd.phone, vnd.email, vnd.service_description]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [vendors, selectedService, searchQuery]);

  const handleOpenAdd = () => {
    setEditingVendor(null);
    setFormData({ ...EMPTY_FORM, service_id: services[0] ? String(services[0].service_id) : '' });
    setFormErrors({});
    setModalOpen(true);
  };

  const handleOpenEdit = (vnd) => {
    setEditingVendor(vnd);
    setFormData({
      vendor_name: vnd.vendor_name || '',
      service_id: vnd.service_id ? String(vnd.service_id) : '',
      service_description: vnd.service_description || '',
      phone: vnd.phone || '',
      email: vnd.email || '',
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    const name = formData.vendor_name.trim();
    if (!name) errs.vendor_name = 'Vendor name is required';
    else if (name.length > 150) errs.vendor_name = 'Vendor name cannot exceed 150 characters';
    if (!formData.service_id) errs.service_id = 'Select a service';
    if (formData.phone.trim().length > 20) errs.phone = 'Phone cannot exceed 20 characters';
    const email = formData.email.trim();
    if (email.length > 150) errs.email = 'Email cannot exceed 150 characters';
    else if (email && !EMAIL_PATTERN.test(email)) errs.email = 'Enter a valid email address';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    const payload = {
      vendor_name: formData.vendor_name.trim(),
      service_id: Number(formData.service_id),
      service_description: formData.service_description.trim() || null,
      phone: formData.phone.trim() || null,
      email: formData.email.trim() || null,
    };

    setSaving(true);
    try {
      if (editingVendor) {
        const saved = await vendorsApi.update(editingVendor.vendor_id, payload);
        setVendors((prev) =>
          prev.map((v) => (v.vendor_id === saved.vendor_id ? { ...v, ...saved } : v))
        );
        toast.success(`Vendor "${saved.vendor_name}" updated.`);
      } else {
        const saved = await vendorsApi.create(payload);
        setVendors((prev) => [{ ...saved, events_served: 0 }, ...prev]);
        toast.success(`Vendor "${saved.vendor_name}" added.`);
      }
      setModalOpen(false);
    } catch (err) {
      toast.error(`Could not save vendor: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteVendor = async () => {
    if (!vendorToDelete) return;
    setDeleting(true);
    try {
      await vendorsApi.delete(vendorToDelete.vendor_id);
      setVendors((prev) => prev.filter((v) => v.vendor_id !== vendorToDelete.vendor_id));
      toast.success(`Vendor "${vendorToDelete.vendor_name}" deleted.`);
      setDeleteModalOpen(false);
      setVendorToDelete(null);
    } catch (err) {
      toast.error(`Could not delete vendor: ${err.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const inputClass =
    'w-full px-3.5 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine';
  const labelClass = 'block text-xs font-heading uppercase tracking-wider text-ink';

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
            Vendors and the service each one provides, from the <code>vendors</code> and{' '}
            <code>services</code> tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            id="add-vendor-button"
            onClick={handleOpenAdd}
            disabled={loading || !!loadError}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-wine-light disabled:opacity-50 disabled:cursor-not-allowed"
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

      {loadError && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-300 flex items-start gap-3 shadow-sm">
          <AlertCircle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-ink/80">
            <strong className="text-red-700 font-semibold block mb-0.5">
              Could not load vendors from the database
            </strong>
            {loadError}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-sand rounded-2xl border border-sand-dark p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-wine absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="vendor-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, email or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-medium text-ink placeholder-ink/40 focus:outline-none focus:ring-2 focus:ring-wine"
            />
          </div>

          <select
            id="vendor-service-filter"
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full px-3 py-2.5 bg-sand-dark/30 border border-sand-dark rounded-xl text-xs font-semibold text-ink focus:outline-none focus:ring-2 focus:ring-wine"
          >
            <option value="All">All Services</option>
            {services.map((s) => (
              <option key={s.service_id} value={String(s.service_id)}>
                {s.service_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-sand rounded-2xl border border-sand-dark shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-sand-dark/60 text-wine border-b border-sand-dark font-heading uppercase tracking-wider text-[11px]">
                <th className="p-4">Vendor</th>
                <th className="p-4">Service</th>
                <th className="p-4">Contact</th>
                <th className="p-4 text-center">Events Served</th>
                <th className="p-4">Added On</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-dark/60 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-ink/60">
                    Loading vendors…
                  </td>
                </tr>
              ) : filteredVendors.length > 0 ? (
                filteredVendors.map((vnd) => (
                  <tr key={vnd.vendor_id} className="hover:bg-sand-dark/25 transition-colors">
                    <td className="p-4 max-w-xs">
                      <span className="font-heading text-ink text-sm block">{vnd.vendor_name}</span>
                      {vnd.service_description && (
                        <span className="text-[11px] text-ink/60 line-clamp-2">
                          {vnd.service_description}
                        </span>
                      )}
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className="inline-block px-3 py-1 rounded-full text-[10px] font-heading uppercase tracking-wider bg-sand-dark text-wine">
                        {vnd.service_name}
                      </span>
                    </td>

                    <td className="p-4 whitespace-nowrap space-y-0.5">
                      {vnd.phone ? (
                        <div className="flex items-center gap-1.5 text-ink">
                          <Phone className="w-3 h-3 text-wine" />
                          {vnd.phone}
                        </div>
                      ) : null}
                      {vnd.email ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-ink/70">
                          <Mail className="w-3 h-3 text-wine" />
                          {vnd.email}
                        </div>
                      ) : null}
                      {!vnd.phone && !vnd.email && <span className="text-ink/40">—</span>}
                    </td>

                    <td className="p-4 text-center font-semibold text-ink tabular-nums">
                      {vnd.events_served ?? 0}
                    </td>

                    <td className="p-4 whitespace-nowrap text-ink/70">{formatDate(vnd.created_at)}</td>

                    <td className="p-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(vnd)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-sand-dark bg-sand text-ink hover:bg-wine hover:text-sand hover:border-wine text-xs font-semibold transition-all shadow-sm"
                          title="Edit vendor"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVendorToDelete(vnd);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-red-200 text-red-700 hover:bg-red-700 hover:text-white transition-colors"
                          title="Delete vendor"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-ink/60">
                    {vendors.length === 0 && !loadError
                      ? 'No vendors in the database yet. Click "Add Vendor" to create the first one.'
                      : 'No vendors match your search.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit modal */}
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
                  {editingVendor ? 'Edit Vendor' : 'Add Vendor'}
                </h3>
                <p className="text-xs text-ink/70">
                  {editingVendor ? `Vendor #${editingVendor.vendor_id}` : 'Saved to the vendors table'}
                </p>
              </div>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4" noValidate>
              <div className="space-y-1">
                <label htmlFor="vendor_name" className={labelClass}>
                  Vendor Name <span className="text-red-700">*</span>
                </label>
                <input
                  id="vendor_name"
                  type="text"
                  maxLength={150}
                  value={formData.vendor_name}
                  onChange={(e) => setFormData({ ...formData, vendor_name: e.target.value })}
                  placeholder="e.g. Delicious Catering"
                  className={inputClass}
                />
                {formErrors.vendor_name && <p className="text-xs text-red-700">{formErrors.vendor_name}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="service_id" className={labelClass}>
                  Service <span className="text-red-700">*</span>
                </label>
                <select
                  id="service_id"
                  value={formData.service_id}
                  onChange={(e) => setFormData({ ...formData, service_id: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select a service</option>
                  {services.map((s) => (
                    <option key={s.service_id} value={String(s.service_id)}>
                      {s.service_name}
                    </option>
                  ))}
                </select>
                {formErrors.service_id && <p className="text-xs text-red-700">{formErrors.service_id}</p>}
              </div>

              <div className="space-y-1">
                <label htmlFor="service_description" className={labelClass}>
                  Service Description
                </label>
                <textarea
                  id="service_description"
                  rows={3}
                  value={formData.service_description}
                  onChange={(e) => setFormData({ ...formData, service_description: e.target.value })}
                  placeholder="e.g. Food and beverage services for up to 500 guests"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="vendor_phone" className={labelClass}>
                    Phone
                  </label>
                  <input
                    id="vendor_phone"
                    type="tel"
                    maxLength={20}
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="9876543210"
                    className={inputClass}
                  />
                  {formErrors.phone && <p className="text-xs text-red-700">{formErrors.phone}</p>}
                </div>

                <div className="space-y-1">
                  <label htmlFor="vendor_email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="vendor_email"
                    type="email"
                    maxLength={150}
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="vendor@example.com"
                    className={inputClass}
                  />
                  {formErrors.email && <p className="text-xs text-red-700">{formErrors.email}</p>}
                </div>
              </div>

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
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-wine text-sand font-heading text-xs uppercase tracking-wider font-bold hover:bg-wine-dark transition-all shadow-sm disabled:opacity-60"
                >
                  {saving ? 'Saving…' : editingVendor ? 'Save Changes' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Vendor?"
        message={`Permanently delete "${vendorToDelete?.vendor_name}"? Its links to events in event_vendors are removed too.`}
        confirmText="Confirm Delete"
        cancelText="Cancel"
        isDanger={true}
        isLoading={deleting}
        onConfirm={confirmDeleteVendor}
        onClose={() => {
          setDeleteModalOpen(false);
          setVendorToDelete(null);
        }}
      />
    </div>
  );
}
