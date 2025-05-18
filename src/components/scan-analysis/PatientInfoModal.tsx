import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import {
  Form, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PatientInfoState } from '@/pages/ScanAnalysis'; // Import the state type

// Form schema for patient info (Moved from ScanAnalysis)
const patientInfoSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  date_of_birth: z.string().min(1, { message: "Date of birth is required." }),
  gender: z.string().min(1, { message: "Please select a gender." }),
  country: z.string().min(1, { message: "Please select a country." }),
  city: z.string().min(2, { message: "City must be at least 2 characters." }),
});

type PatientInfoValues = z.infer<typeof patientInfoSchema>;

interface PatientInfoModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: PatientInfoState) => void;
}

const PatientInfoModal: React.FC<PatientInfoModalProps> = ({ isOpen, onOpenChange, onSubmit }) => {
  const form = useForm<PatientInfoValues>({
    mode: "onChange",
    resolver: zodResolver(patientInfoSchema),
    defaultValues: {
      name: "",
      date_of_birth: "",
      gender: "",
      country: "",
      city: "",
    },
  });

  const handleFormSubmit = (data: PatientInfoValues) => {
    // Split name into first and last
    const nameParts = data.name.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

    // Prepare state object
    const patientData: PatientInfoState = {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: data.date_of_birth,
      gender: data.gender,
      country: data.country,
      city: data.city,
    };
    
    onSubmit(patientData); // Pass formatted data up
    onOpenChange(false); // Close modal on successful submit
    form.reset(); // Reset form after submission
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-700" closeOnOutsideClick={false}>
        <DialogHeader>
          <DialogTitle className="text-gray-100">
            Patient Information
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Please provide patient details for the X-ray analysis.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleFormSubmit)} // Use internal handler
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="name">Full Name</FormLabel>
                  <Input
                    id="name"
                    placeholder="Enter patient name"
                    {...field}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="date_of_birth">Date of Birth</FormLabel>
                  <Input
                    id="date_of_birth"
                    placeholder="YYYY-MM-DD"
                    type="date"
                    {...field}
                  />
                  <div className="text-xs text-gray-400">
                    Please select the patient's complete date of birth
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="gender">Gender</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="country"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="country">Country</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <SelectTrigger id="country">
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="us">United States</SelectItem>
                      <SelectItem value="uk">United Kingdom</SelectItem>
                      <SelectItem value="ca">Canada</SelectItem>
                      <SelectItem value="au">Australia</SelectItem>
                      <SelectItem value="in">India</SelectItem>
                      <SelectItem value="pk">Pakistan</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel htmlFor="city">City</FormLabel>
                  <Input id="city" placeholder="Enter city" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Save Information</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default PatientInfoModal; 