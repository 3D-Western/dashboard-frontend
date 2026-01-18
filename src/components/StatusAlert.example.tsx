/**
 * StatusAlert Component - Usage Examples
 *
 * A flexible alert component with support for different variants,
 * custom icons, actions, and dismissible functionality.
 */

import { StatusAlert } from './StatusAlert';
import { Button } from './ui/button';
import { Rocket } from 'lucide-react';

export function StatusAlertExamples() {
  return (
    <div className="space-y-4 p-4">
      {/* Basic usage - Default variant */}
      <StatusAlert
        title="Information"
        description="This is a default informational alert."
      />

      {/* Warning variant with custom action */}
      <StatusAlert
        variant="warning"
        title="Email Not Verified"
        description="Your email address has not been verified. Please check your inbox."
        action={
          <Button size="sm" variant="outline">
            Resend Verification Email
          </Button>
        }
      />

      {/* Error/Destructive variant */}
      <StatusAlert
        variant="destructive"
        title="Login Failed"
        description="Invalid credentials. Please check your Student ID and password."
      />

      {/* Success variant */}
      <StatusAlert
        variant="success"
        title="Account Created"
        description="Your account has been created successfully!"
      />

      {/* Without icon */}
      <StatusAlert
        title="No Icon Alert"
        description="This alert doesn't show an icon."
        icon={false}
      />

      {/* Custom icon */}
      <StatusAlert
        title="Custom Icon"
        description="This alert uses a custom icon."
        icon={<Rocket className="h-4 w-4" />}
      />

      {/* Dismissible alert */}
      <StatusAlert
        variant="warning"
        title="Dismissible Alert"
        description="You can close this alert by clicking the X button."
        dismissible
        onDismiss={() => console.log('Alert dismissed')}
      />

      {/* Complex example with action and dismissible */}
      <StatusAlert
        variant="warning"
        title="Action Required"
        description="Please complete your profile to continue using all features."
        dismissible
        onDismiss={() => console.log('Alert dismissed')}
        action={
          <Button size="sm" variant="default">
            Complete Profile
          </Button>
        }
      />
    </div>
  );
}
