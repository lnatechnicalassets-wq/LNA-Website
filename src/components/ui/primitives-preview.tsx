"use client";

import * as React from "react";
import { Button } from "./button";
import { Badge } from "./badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";
import { Input } from "./input";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "./dialog";

export function PrimitivesPreview() {
  const [demoInput, setDemoInput] = React.useState("");
  const [hasError, setHasError] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const toggleLoading = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1500);
  };

  return (
    <section className="space-y-8" data-testid="primitives-preview-section">
      <div className="border-b border-border-subtle pb-3">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-primary-900">
          5. Base Accessible UI Primitives (P2-T2)
        </h2>
        <p className="text-sm text-text-secondary mt-1">
          Interactive Radix and Tailwind CSS 4 primitives: Button, Badge, Card, Input, and Dialog.
        </p>
      </div>

      {/* 1. Buttons Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Button Primitives</CardTitle>
          <CardDescription>
            Variants, sizes, loading states, and accessible visible focus rings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="accent">Accent</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border-subtle">
            <Button size="sm" variant="primary">
              Small (sm)
            </Button>
            <Button size="md" variant="primary">
              Medium (md)
            </Button>
            <Button size="lg" variant="primary">
              Large (lg, 48px touch)
            </Button>
            <Button variant="outline" isLoading={isLoading} onClick={toggleLoading}>
              {isLoading ? "Saving..." : "Click to Test Loading"}
            </Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 2. Badges Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Primitives</CardTitle>
          <CardDescription>
            Semantic status indicators pairing color with explicit textual labels (SRS 11.1).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge variant="primary">Primary</Badge>
            <Badge variant="accent">Accent</Badge>
            <Badge variant="success" dot>
              Success / Confirmed
            </Badge>
            <Badge variant="warning" dot>
              Warning / Hold
            </Badge>
            <Badge variant="danger" dot>
              Danger / Expired
            </Badge>
            <Badge variant="info" dot>
              Info / Offline
            </Badge>
            <Badge variant="outline">Outline</Badge>
          </div>
        </CardContent>
      </Card>

      {/* 3. Inputs Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Input Primitives</CardTitle>
          <CardDescription>
            Accessible form inputs with labels, helper text, and real-time validation states.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Input
            label="Full Name"
            placeholder="e.g. Tanvir Ahmed"
            helperText="Legal name for enrollment verification."
            required
            value={demoInput}
            onChange={(e) => setDemoInput(e.target.value)}
          />

          <Input
            label="Email Address (Validation Test)"
            placeholder="applicant@example.com"
            error={hasError ? "Please enter a valid academic or professional email." : undefined}
            helperText={!hasError ? "Status updates will be sent here." : undefined}
            defaultValue="invalid-email"
          />

          <Input
            label="Application Reference"
            placeholder="LNA-XXXX-XXXX"
            defaultValue="LNA-7K3M-9XQ2"
            disabled
            helperText="System-generated unguessable reference."
          />
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button size="sm" variant="outline" onClick={() => setHasError(!hasError)}>
            Toggle Validation Error State
          </Button>
        </CardFooter>
      </Card>

      {/* 4. Dialog & Cards Preview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card variant="interactive">
          <CardHeader>
            <CardTitle>Interactive Card Primitive</CardTitle>
            <CardDescription>
              Demonstrating hover elevation, smooth border transitions, and card layouts.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-text-secondary">
              Cards provide modular surfaces for course cards, batch schedules, and administrative
              data listings.
            </p>
          </CardContent>
          <CardFooter>
            <Badge variant="accent">Interactive</Badge>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Radix Dialog Primitive</CardTitle>
            <CardDescription>
              Accessible modal dialog with focus trapping, backdrop blur, and keyboard dismissal.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-text-secondary">
              Fully compliant with WCAG 2.2 AA (escapes on Esc, restores focus, locks body scroll).
            </p>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="primary">Open Accessible Dialog</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Course Application</DialogTitle>
                  <DialogDescription>
                    Please review your applicant details before proceeding to payment.
                  </DialogDescription>
                </DialogHeader>
                <div className="py-3 space-y-3">
                  <Input
                    label="Applicant Email"
                    defaultValue="applicant@example.com"
                    helperText="A 30-minute seat hold will be reserved upon submission."
                  />
                  <div className="p-3 rounded-lg bg-surface-muted text-xs text-text-secondary space-y-1">
                    <p className="font-semibold text-primary-900">Seat Reservation Notice:</p>
                    <p>
                      Reserved seats expire passively if checkout is not completed within 30
                      minutes.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button variant="accent" onClick={() => setDialogOpen(false)}>
                    Confirm & Hold Seat
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
