import { ImagePlus, Star, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { adminApi, type AdminCaseDetail } from '@/api/endpoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

import { Panel, useAdminMutation } from './shared';

const MAX_SIZE = 10 * 1024 * 1024;

/** 案例图片：上传（≤ 10 MB，可多选）、删除、设封面（F09、F10）。 */
export function CaseImageManager({ item }: { item: AdminCaseDetail }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const upload = useAdminMutation((file: File) => adminApi.uploadImage(item.id, file));
  const remove = useAdminMutation((imageId: number) => adminApi.deleteImage(item.id, imageId), { success: '图片已删除' });
  const cover = useAdminMutation((imageId: number) => adminApi.setCover(item.id, imageId), { success: '已设为封面' });

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files);
    setUploading(list.length);
    let ok = 0;
    for (const file of list) {
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} 超过 10 MB`);
      } else if (await upload.mutateAsync(file).then(() => true, () => false)) {
        ok += 1;
      }
      setUploading((n) => n - 1);
    }
    if (ok) toast.success(`已上传 ${ok} 张图片`);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <Panel className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-bold">图片</h2>
        <Button size="sm" variant="accent" disabled={uploading > 0} onClick={() => inputRef.current?.click()}>
          <ImagePlus /> {uploading > 0 ? `上传中（剩 ${uploading} 张）` : '上传图片'}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          hidden
          onChange={(e) => void onFiles(e.target.files)}
        />
      </div>
      <p className="text-xs text-muted">支持 JPEG / PNG / WebP，单张不超过 10 MB。第一张为封面。</p>
      {item.images.length === 0 ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="grid h-40 place-items-center rounded-card border border-dashed border-border text-sm text-muted transition-colors hover:border-fg hover:text-fg"
        >
          暂无图片，点击上传
        </button>
      ) : (
        <ul className="grid grid-cols-2 gap-3">
          {item.images.map((image, index) => (
            <li key={image.id} className="overflow-hidden rounded-card border border-border">
              <a href={image.url} target="_blank" rel="noreferrer" className="block aspect-[4/5]" style={{ backgroundColor: image.color }}>
                <img src={image.thumb.url} alt="" className="size-full object-cover" loading="lazy" />
              </a>
              <div className="flex items-center justify-between gap-1 p-1.5">
                {index === 0 ? (
                  <Badge variant="accent">
                    <Star className="size-3" /> 封面
                  </Badge>
                ) : (
                  <Button size="sm" variant="ghost" disabled={cover.isPending} onClick={() => cover.mutate(image.id)}>
                    设为封面
                  </Button>
                )}
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="删除图片"
                  disabled={remove.isPending}
                  onClick={() => confirm('确定删除这张图片吗？') && remove.mutate(image.id)}
                >
                  <Trash2 className="text-danger" />
                </Button>
              </div>
              <p className="px-2 pb-2 text-[11px] text-muted tabular-nums">
                {image.width}×{image.height}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
