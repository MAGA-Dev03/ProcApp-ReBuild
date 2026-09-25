package lk.maga.procapp.dto.dashboard;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class AgingBucketBreakdownResponse {
    private String bucket;
    private List<AgingBreakdownRow> bySupplier;
    private List<AgingBreakdownRow> byProject;
}
