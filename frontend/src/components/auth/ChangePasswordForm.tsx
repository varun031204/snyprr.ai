/**
 * ChangePasswordForm
 *
 * Inline expandable panel rendered inside the Settings > Security card.
 * Calls POST /api/profiles/me/password which verifies the current password
 * server-side before updating via Supabase Admin API.
 *
 * Security:
 *  - Passwords never appear in logs, URLs, or error messages
 *  - Current password is verified on the backend, not the frontend
 *  - Validation is performed on both frontend and backend
 *  - Rate limiting is enforced on the backend (5 attempts / 15 min)
 */

import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, CheckCircle2, XCircle, Lock, AlertCircle, Loader2, Link as LinkIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { profilesUserService } from '../../services/api/profilesService';
import { isSupabasePlaceholder } from '../../lib/supabase';

// ── Password rule definitions ──────────────────────────────────────────────

interface Rule {
  id: string;
  label: string;
  test: (pw: string) => boolean;
}

const PASSWORD_RULES: Rule[] = [
  { id: 'length',    label: 'At least 8 characters',            test: (pw) => pw.length >= 8 },
  { id: 'upper',     label: 'One uppercase letter (A–Z)',        test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower',     label: 'One lowercase letter (a–z)',        test: (pw) => /[a-z]/.test(pw) },
  { id: 'number',    label: 'One number (0–9)',                  test: (pw) => /[0-9]/.test(pw) },
  { id: 'special',   label: 'One special character (@#$%&!…)',   test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

function passwordScore(pw: string): number {
  return PASSWORD_RULES.filter((r) => r.test(pw)).length;
}

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very Strong'];
const STRENGTH_COLORS = [
  '',
  'bg-[var(--color-danger)]',
  'bg-[var(--color-warning)]',
  'bg-[var(--color-warning)]',
  'bg-[var(--color-success)]',
  'bg-[var(--color-success)]',
];

// ── Props ──────────────────────────────────────────────────────────────────

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

// ── Component ──────────────────────────────────────────────────────────────

export function ChangePasswordForm({ onCancel, onSuccess }: Props) {
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Derived validation state
  const score = passwordScore(newPw);
  const allRulesPassed = score === PASSWORD_RULES.length;
  const passwordsMatch = confirmPw.length > 0 && newPw === confirmPw;
  const passwordsMismatch = confirmPw.length > 0 && newPw !== confirmPw;
  const isSameAsCurrent = newPw.length > 0 && newPw === currentPw;

  const canSubmit =
    currentPw.length > 0 &&
    allRulesPassed &&
    passwordsMatch &&
    !isSameAsCurrent &&
    !isSubmitting;

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setServerError('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (isSupabasePlaceholder) {
        // Dev bypass — simulate success
        await new Promise((r) => setTimeout(r, 800));
        setSuccessMsg('Password changed successfully. (Dev mode — no real change made)');
        setCurrentPw(''); setNewPw(''); setConfirmPw('');
        setTimeout(() => onSuccess(), 1500);
        return;
      }

      await profilesUserService.changePassword(currentPw, newPw);

      setSuccessMsg('Your password has been changed successfully.');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      // Map common server messages to friendly copy
      const msg: string = err?.message ?? 'Something went wrong. Please try again.';
      if (msg.toLowerCase().includes('incorrect') || msg.toLowerCase().includes('current password')) {
        setServerError('Current password is incorrect. Please try again.');
      } else if (msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('too many')) {
        setServerError('Too many attempts. Please wait 15 minutes and try again.');
      } else {
        setServerError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [canSubmit, currentPw, newPw, onSuccess]);

  return (
    <form onSubmit={handleSubmit} className="space-y-5 pt-2">

      {/* Success banner */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--color-success-bg)] border border-[var(--color-success)]/30 text-[var(--color-success)] text-sm">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span className="font-medium">{successMsg}</span>
        </div>
      )}

      {/* Error banner */}
      {serverError && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-[var(--color-danger-bg)] border border-[var(--color-danger)]/30 text-[var(--color-danger)] text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Current password */}
      <Input
        label="Current Password"
        type={showCurrent ? 'text' : 'password'}
        placeholder="Your current password"
        value={currentPw}
        onChange={(e) => { setCurrentPw(e.target.value); setServerError(''); }}
        autoComplete="current-password"
        autoFocus
        required
        rightIcon={
          <button type="button" onClick={() => setShowCurrent((v) => !v)} tabIndex={-1}>
            {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        }
      />

      {/* Forgot password link */}
      <div className="-mt-2">
        <Link
          to="/forgot-password"
          className="text-xs text-[var(--brand-primary)] hover:underline inline-flex items-center gap-1"
        >
          <LinkIcon className="w-3 h-3" />
          Forgot your current password?
        </Link>
      </div>

      {/* New password */}
      <div className="space-y-2">
        <Input
          label="New Password"
          type={showNew ? 'text' : 'password'}
          placeholder="Create a strong password"
          value={newPw}
          onChange={(e) => { setNewPw(e.target.value); setServerError(''); }}
          autoComplete="new-password"
          required
          error={isSameAsCurrent ? 'New password must be different from current password' : undefined}
          rightIcon={
            <button type="button" onClick={() => setShowNew((v) => !v)} tabIndex={-1}>
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          }
        />

        {/* Strength bar */}
        {newPw.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-all ${
                      i <= score ? STRENGTH_COLORS[score] : 'bg-[var(--border-subtle)]'
                    }`}
                  />
                ))}
              </div>
              <span className={`text-[11px] font-semibold w-20 text-right ${
                score >= 4 ? 'text-[var(--color-success)]' :
                score >= 2 ? 'text-[var(--color-warning)]' : 'text-[var(--color-danger)]'
              }`}>
                {STRENGTH_LABELS[score]}
              </span>
            </div>

            {/* Per-rule checklist */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {PASSWORD_RULES.map((rule) => {
                const passed = rule.test(newPw);
                return (
                  <div key={rule.id} className="flex items-center gap-1.5 text-[11px]">
                    {passed
                      ? <CheckCircle2 className="w-3 h-3 text-[var(--color-success)] flex-shrink-0" />
                      : <XCircle className="w-3 h-3 text-[var(--text-muted)] flex-shrink-0" />}
                    <span className={passed ? 'text-[var(--color-success)]' : 'text-[var(--text-muted)]'}>
                      {rule.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Confirm new password */}
      <Input
        label="Confirm New Password"
        type={showConfirm ? 'text' : 'password'}
        placeholder="Re-enter your new password"
        value={confirmPw}
        onChange={(e) => { setConfirmPw(e.target.value); setServerError(''); }}
        autoComplete="new-password"
        required
        error={passwordsMismatch ? 'Passwords do not match' : undefined}
        rightIcon={
          <div className="flex items-center gap-1.5">
            {passwordsMatch && <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />}
            {passwordsMismatch && <XCircle className="w-4 h-4 text-[var(--color-danger)]" />}
            <button type="button" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        }
      />

      {/* Action buttons */}
      <div className="flex items-center gap-3 pt-1">
        <Button
          type="submit"
          variant="primary"
          disabled={!canSubmit}
          leftIcon={isSubmitting
            ? <Loader2 className="w-4 h-4 animate-spin" />
            : <Lock className="w-4 h-4" />}
        >
          {isSubmitting ? 'Changing…' : 'Change Password'}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
      </div>

      <p className="text-[10px] text-[var(--text-muted)]">
        Passwords are encrypted and never stored in plain text.
        Your current session remains active after the change.
      </p>
    </form>
  );
}
