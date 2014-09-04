package gov.nysenate.openleg.client.view.spotcheck;

import gov.nysenate.openleg.model.spotcheck.SpotCheckMismatchStatus;
import gov.nysenate.openleg.model.spotcheck.SpotCheckMismatchType;
import gov.nysenate.openleg.model.spotcheck.SpotCheckReport;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

public class ReportInfoView<ContentKey>
{
    protected String referenceType;
    protected LocalDateTime reportDateTime;
    protected Map<SpotCheckMismatchStatus, Long> mismatchStatuses;
    protected Map<SpotCheckMismatchType, Map<SpotCheckMismatchStatus, Long>> mismatchTypes;

    public ReportInfoView(SpotCheckReport<ContentKey> report) {
        if (report != null) {
            this.referenceType = report.getReferenceType().name();
            this.reportDateTime = report.getReportDateTime();
            this.mismatchStatuses = report.getMismatchStatusCounts();
            this.mismatchTypes = report.getMismatchTypeStatusCounts();
        }
    }

    public String getReferenceType() {
        return referenceType;
    }

    public LocalDateTime getReportDateTime() {
        return reportDateTime;
    }

    public Map<SpotCheckMismatchStatus, Long> getMismatchStatuses() {
        return mismatchStatuses;
    }

    public Map<SpotCheckMismatchType, Map<SpotCheckMismatchStatus, Long>> getMismatchTypes() {
        return mismatchTypes;
    }

    public Long getTotalMismatches() {
        return mismatchStatuses.values().stream().reduce(Long::sum).orElse(0L);
    }
}