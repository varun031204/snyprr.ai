/**
 * Seed PRO and VIP subscription plans into the DB, fix trial duration
 * to 7 days, and add expiry auto-update logic.
 */
import { db } from './pool.js';

async function run() {
  console.log('📦 Setting up subscription plans...');
  try {
    // 1. Ensure Free Trial plan is named "7-Day Free Trial"
    await db.query(`
      UPDATE public.subscription_plans
      SET name        = '7-Day Free Trial',
          description = '7-day free access granted automatically on signup. Full platform access, no credit card required.'
      WHERE billing_interval = 'FREE_TRIAL';
    `);
    console.log('✅ Free Trial plan updated to 7-Day Free Trial');

    // 2. Add billing_interval options if not already there
    // The CHECK constraint only allows FREE_TRIAL, MONTHLY, QUARTERLY, YEARLY
    // Standard / Monthly plan
    await db.query(`
      INSERT INTO public.subscription_plans
        (name, description, price, currency, billing_interval, is_active)
      VALUES
        ('Standard Monthly', 'Full platform access — monthly billing', 999.00, 'INR', 'MONTHLY', true)
      ON CONFLICT DO NOTHING;
    `);

    await db.query(`
      INSERT INTO public.subscription_plans
        (name, description, price, currency, billing_interval, is_active)
      VALUES
        ('Standard Yearly', 'Full platform access — yearly billing (save 8%)', 10990.00, 'INR', 'YEARLY', true)
      ON CONFLICT DO NOTHING;
    `);

    await db.query(`
      INSERT INTO public.subscription_plans
        (name, description, price, currency, billing_interval, is_active)
      VALUES
        ('Premium Monthly', 'Advanced features — monthly billing', 1499.00, 'INR', 'MONTHLY', true)
      ON CONFLICT DO NOTHING;
    `);

    await db.query(`
      INSERT INTO public.subscription_plans
        (name, description, price, currency, billing_interval, is_active)
      VALUES
        ('Premium Yearly', 'Advanced features — yearly billing (save ~11%)', 15990.00, 'INR', 'YEARLY', true)
      ON CONFLICT DO NOTHING;
    `);

    // Verify
    const plans = await db.query(
      'SELECT name, price, billing_interval FROM public.subscription_plans ORDER BY price'
    );
    console.log('📋 Subscription plans in DB:');
    plans.rows.forEach((p: any) => console.log(`   ${p.name}: ₹${p.price} (${p.billing_interval})`));

    // 3. Fix trial duration: expire all ACTIVE FREE_TRIAL subscriptions that
    //    started more than 7 days ago
    const expired = await db.query(`
      UPDATE public.user_subscriptions
      SET status = 'EXPIRED'
      WHERE status = 'ACTIVE'
        AND plan_id IN (
          SELECT id FROM public.subscription_plans WHERE billing_interval = 'FREE_TRIAL'
        )
        AND expires_at < now()
      RETURNING id;
    `);
    console.log(`✅ Expired ${expired.rowCount} stale FREE_TRIAL subscriptions`);

    // 4. Update the trigger to use 7 days (was 14/15 days in old migration)
    await db.query(`
      CREATE OR REPLACE FUNCTION public.handle_email_verified()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      SECURITY DEFINER SET search_path = public
      AS $$
      DECLARE
        v_plan_id uuid;
      BEGIN
        IF (OLD.email_confirmed_at IS NULL AND NEW.email_confirmed_at IS NOT NULL) THEN
          -- Activate the profile
          UPDATE public.profiles
          SET account_status = 'ACTIVE', updated_at = now()
          WHERE id = NEW.id AND account_status = 'PENDING_VERIFICATION';

          -- Start 7-day free trial
          SELECT id INTO v_plan_id
          FROM public.subscription_plans
          WHERE billing_interval = 'FREE_TRIAL' AND is_active = true
          LIMIT 1;

          IF v_plan_id IS NOT NULL THEN
            INSERT INTO public.user_subscriptions (user_id, plan_id, status, started_at, expires_at)
            VALUES (NEW.id, v_plan_id, 'ACTIVE', now(), now() + interval '7 days')
            ON CONFLICT DO NOTHING;
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$;
    `);
    console.log('✅ Email verification trigger updated to 7-day trial');

    console.log('🎉 Done!');
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  } finally {
    await db.end();
  }
}

run();
