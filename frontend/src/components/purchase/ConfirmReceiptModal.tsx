import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, MapPin, Loader2, CheckCircle, XCircle } from "lucide-react";
import { takePhoto } from "@/lib/capacitor-camera";
import { getCurrentPosition, reverseGeocode } from "@/lib/capacitor-geolocation";
import { toast } from "sonner";
import { PurchaseHistory } from "@/services/api/purchase";

interface ConfirmReceiptModalProps {
  open: boolean;
  onClose: () => void;
  purchaseHistory: PurchaseHistory;
  onConfirm: (data: {
    proofPhotoUrl: string;
    geoLocation?: string;
    latitude: number;
    longitude: number;
  }) => Promise<void>;
}

export function ConfirmReceiptModal({
  open,
  onClose,
  purchaseHistory,
  onConfirm,
}: ConfirmReceiptModalProps) {
  const [step, setStep] = useState<'info' | 'photo' | 'location' | 'confirming'>('info');
  const [proofPhotoUrl, setProofPhotoUrl] = useState<string | null>(null);
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [geoLocation, setGeoLocation] = useState<string | null>(null);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(false);

  const handleTakePhoto = async () => {
    try {
      setIsLoadingPhoto(true);
      const photoUrl = await takePhoto();
      if (photoUrl) {
        setProofPhotoUrl(photoUrl);
        setStep('location');
      } else {
        toast.error("Photo capture is required for GRN");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to capture photo");
    } finally {
      setIsLoadingPhoto(false);
    }
  };

  const handleGetLocation = async () => {
    try {
      setIsLoadingLocation(true);
      const position = await getCurrentPosition();
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      
      setLatitude(lat);
      setLongitude(lng);
      
      try {
        const address = await reverseGeocode(lat, lng);
        setGeoLocation(address);
      } catch (e) {
        // Location reverse geocoding failed, but we have coordinates
        console.warn("Failed to reverse geocode location");
      }
      
      setStep('confirming');
    } catch (error: any) {
      toast.error(error.message || "Failed to get location. Please enable location services.");
    } finally {
      setIsLoadingLocation(false);
    }
  };

  const handleConfirm = async () => {
    if (!proofPhotoUrl || latitude === null || longitude === null) {
      toast.error("Photo and location are required");
      return;
    }

    try {
      await onConfirm({
        proofPhotoUrl,
        geoLocation: geoLocation || undefined,
        latitude,
        longitude,
      });
      handleClose();
    } catch (error: any) {
      // Error is handled by parent component
      throw error;
    }
  };

  const handleClose = () => {
    setStep('info');
    setProofPhotoUrl(null);
    setLatitude(null);
    setLongitude(null);
    setGeoLocation(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Material Receipt</DialogTitle>
          <DialogDescription>
            {purchaseHistory.materialName} ({purchaseHistory.qty} {purchaseHistory.unit})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'info' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  To confirm receipt, you need to:
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-800 dark:text-blue-200 list-disc list-inside">
                  <li>Take a photo of the received materials</li>
                  <li>Provide your current GPS location</li>
                  <li>Location must be within project site boundaries</li>
                </ul>
              </div>
              <Button onClick={() => setStep('photo')} className="w-full">
                <Camera className="w-4 h-4 mr-2" />
                Start Confirmation
              </Button>
            </div>
          )}

          {step === 'photo' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Take a photo of the received materials
                </p>
                {proofPhotoUrl ? (
                  <div className="space-y-2">
                    <img
                      src={proofPhotoUrl}
                      alt="Proof"
                      className="w-full rounded-md border object-cover max-h-64"
                    />
                    <div className="flex items-center justify-center gap-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Photo captured</span>
                    </div>
                    <Button onClick={handleTakePhoto} variant="outline" className="w-full">
                      Retake Photo
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={handleTakePhoto}
                    disabled={isLoadingPhoto}
                    className="w-full"
                  >
                    {isLoadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Capturing...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        Take Photo
                      </>
                    )}
                  </Button>
                )}
              </div>
              {proofPhotoUrl && (
                <Button onClick={handleGetLocation} className="w-full">
                  <MapPin className="w-4 h-4 mr-2" />
                  Get Location
                </Button>
              )}
            </div>
          )}

          {step === 'location' && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">
                  Getting your current location...
                </p>
                <Button
                  onClick={handleGetLocation}
                  disabled={isLoadingLocation}
                  className="w-full"
                >
                  {isLoadingLocation ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="w-4 h-4 mr-2" />
                      Get Location
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {step === 'confirming' && (
            <div className="space-y-4">
              <div className="space-y-2">
                {proofPhotoUrl && (
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 dark:text-green-200">Photo captured</span>
                  </div>
                )}
                {latitude !== null && longitude !== null && (
                  <div className="p-2 bg-green-50 dark:bg-green-950 rounded flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-800 dark:text-green-200">
                      Location: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                    </span>
                  </div>
                )}
                {geoLocation && (
                  <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded">
                    <p className="text-xs text-blue-800 dark:text-blue-200">{geoLocation}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button onClick={handleConfirm} className="flex-1">
                  Confirm Receipt
                </Button>
                <Button onClick={handleClose} variant="outline" className="flex-1">
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
