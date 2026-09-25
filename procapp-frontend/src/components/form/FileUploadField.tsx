import { useId, useState } from 'react'
import { Controller, type Control, type FieldPath, type FieldValues } from 'react-hook-form'
import { FileIcon, UploadCloud, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/lib/format'
import { FormFieldShell } from './FormFieldShell'

interface FileUploadFieldProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label?: string
  description?: string
  required?: boolean
  accept?: string
  disabled?: boolean
  /** Name of an already-uploaded attachment (edit mode) shown until the user picks a new file. */
  existingFileName?: string | null
  /** Called when the user removes the existing attachment without picking a replacement. */
  onRemoveExisting?: () => void
}

/** Single-file drag-and-drop upload with a preview/remove state. Stores a File | null. */
export function FileUploadField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  accept,
  disabled,
  existingFileName,
  onRemoveExisting,
}: FileUploadFieldProps<TFieldValues>) {
  const [isDragging, setIsDragging] = useState(false)
  const inputId = useId()

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const file = (field.value ?? null) as File | null

        return (
          <FormFieldShell
            label={label}
            htmlFor={inputId}
            required={required}
            description={description}
            error={fieldState.error?.message}
          >
            {!file && existingFileName ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-input p-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{existingFileName}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">Current attachment</span>
                </div>
                <div className="flex shrink-0 gap-1">
                  <Button type="button" variant="outline" size="sm" disabled={disabled} asChild>
                    <label htmlFor={inputId} className="cursor-pointer">
                      Replace
                    </label>
                  </Button>
                  {onRemoveExisting && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      onClick={onRemoveExisting}
                      aria-label="Remove attachment"
                    >
                      <X className="size-4" />
                    </Button>
                  )}
                  <input
                    id={inputId}
                    type="file"
                    accept={accept}
                    disabled={disabled}
                    className="hidden"
                    onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                  />
                </div>
              </div>
            ) : file ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-input p-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <FileIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatFileSize(file.size)}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  disabled={disabled}
                  onClick={() => field.onChange(null)}
                  aria-label="Remove file"
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <label
                htmlFor={inputId}
                className={cn(
                  'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-input p-6 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/50',
                  isDragging && 'border-primary bg-muted/50',
                  disabled && 'pointer-events-none opacity-50',
                )}
                onDragOver={(event) => {
                  event.preventDefault()
                  setIsDragging(true)
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setIsDragging(false)
                  const dropped = event.dataTransfer.files?.[0]
                  if (dropped) field.onChange(dropped)
                }}
              >
                <UploadCloud className="size-6" />
                <span>Drag & drop a file here, or click to browse</span>
                <input
                  id={inputId}
                  type="file"
                  accept={accept}
                  disabled={disabled}
                  className="hidden"
                  onChange={(event) => field.onChange(event.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </FormFieldShell>
        )
      }}
    />
  )
}
